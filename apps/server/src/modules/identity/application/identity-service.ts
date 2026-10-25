import { asc, count, eq } from "drizzle-orm";
import { DEFAULT_PREFERENCES, type Me, type Preferences } from "@snug/shared";
import { isAPIError } from "better-auth/api";
import type { Db } from "@/shared/db";
import { InvalidInputError } from "@/shared/errors";
import { type Auth, invitation } from "@/modules/identity/infrastructure/auth";
import { feedToken, mcpToken, user, userPreferences, watchlistToken, webhookToken } from "@/modules/identity/infrastructure/schema";
import { t } from "@/shared/i18n";

const newToken = () => Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString("base64url");

export class IdentityService {
  /** Token in the media server webhook URL: lets its holder mark Episodes as watched. */
  readonly webhookTokens: UserTokens;
  /** Token in read-only feed URLs (calendar, Sonarr list). */
  readonly feedTokens: UserTokens;
  /** Token in the URL other apps (Spotarr) call to add a Series to the Watchlist. */
  readonly watchlistTokens: UserTokens;
  readonly mcpTokens: UserTokens;

  constructor(
    private readonly db: Db,
    private readonly auth: Auth,
  ) {
    this.webhookTokens = new UserTokens(db, webhookToken);
    this.feedTokens = new UserTokens(db, feedToken);
    this.watchlistTokens = new UserTokens(db, watchlistToken);
    this.mcpTokens = new UserTokens(db, mcpToken);
  }

  hasUsers() {
    return (this.db.select({ n: count() }).from(user).get()?.n ?? 0) > 0;
  }

  /** The admin is the first User who signed up. */
  isAdmin(userId: string) {
    return this.db.select({ id: user.id }).from(user).orderBy(asc(user.createdAt)).limit(1).get()?.id === userId;
  }

  me(u: { id: string; name: string; email: string }): Me {
    return { id: u.id, name: u.name, email: u.email, isAdmin: this.isAdmin(u.id) };
  }

  /** A User's name, for log lines ("Mathieu"); the id when the account is gone. */
  nameOf(userId: string) {
    return this.db.select({ name: user.name }).from(user).where(eq(user.id, userId)).get()?.name ?? userId;
  }

  listUsers() {
    return this.db.select({ id: user.id, name: user.name, email: user.email }).from(user).orderBy(asc(user.createdAt)).all();
  }

  /** Admin-only: creates an account while sign-up is closed. */
  async invite(input: { name: string; email: string; password: string }) {
    try {
      await invitation.run(true, () => this.auth.api.signUpEmail({ body: input }));
    } catch (error) {
      if (!isAPIError(error)) throw error;
      const taken = String(error.body?.code ?? "").startsWith("USER_ALREADY_EXISTS");
      throw new InvalidInputError(error.message, taken ? { email: t().errors.emailTaken } : undefined);
    }
  }

  preferences(userId: string): Preferences {
    const row = this.db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).get();
    return { ...DEFAULT_PREFERENCES, ...row?.data };
  }

  updatePreferences(userId: string, changes: Partial<Preferences>): Preferences {
    const data = { ...this.preferences(userId), ...changes };
    this.db
      .insert(userPreferences)
      .values({ userId, data })
      .onConflictDoUpdate({ target: userPreferences.userId, set: { data } })
      .run();
    return data;
  }
}

/** One secret token per User, created on first use, rotatable. */
class UserTokens {
  constructor(
    private readonly db: Db,
    private readonly table: typeof webhookToken | typeof feedToken | typeof watchlistToken | typeof mcpToken,
  ) {}

  of(userId: string): string {
    const existing = this.db.select().from(this.table).where(eq(this.table.userId, userId)).get();
    if (existing) return existing.token;
    const token = newToken();
    this.db.insert(this.table).values({ userId, token }).run();
    return token;
  }

  rotate(userId: string): string {
    const token = newToken();
    this.db
      .insert(this.table)
      .values({ userId, token })
      .onConflictDoUpdate({ target: this.table.userId, set: { token } })
      .run();
    return token;
  }

  userIdOf(token: string): string | null {
    return this.db.select().from(this.table).where(eq(this.table.token, token)).get()?.userId ?? null;
  }
}
