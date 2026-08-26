import { createPortal } from "react-dom";

/**
 * Render children directly into document.body via a portal.
 * Fixes the bug where the drawer/backdrop would render inside a transformed
 * ancestor (any element with `transform` creates a new containing block for
 * `position: fixed`), causing it to only cover part of the layout and bleed
 * through the page underneath instead of properly overlaying the whole screen.
 */
export default function DrawerPortal({ children }) {
  return createPortal(children, document.body);
}