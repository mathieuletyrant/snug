/** Joins the truthy class names: `cx("a", on && "b")`. */
export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");
