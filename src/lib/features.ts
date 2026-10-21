/**
 * Sections that can be switched off. A hidden section disappears from menus and links,
 * and its address behaves as if it didn't exist (the home page goes to the diary).
 * Turn them back on by setting the value to true.
 */
export const features = {
  home: false,
  planner: false,
  wishes: false,
};

/** Where the app starts: the home page when it is on, otherwise the diary. */
export const HOME = features.home ? "/" : "/diario";
