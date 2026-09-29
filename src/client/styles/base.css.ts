// base — split from src/client/mobile.css.ts (2026-08-16), order preserved.
// Do not reorder: styles/index.ts concatenates in this exact order.

export const BASE_CSS = `
/* ---------- base control styles (rendered at any width, hidden where unused) ---------- */

[data-mobile-nav="toggle"],
[data-mobile-nav="files"] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex: none;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--dsw-alias-label-secondary, inherit);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
[data-mobile-nav="toggle"]:hover,
[data-mobile-nav="files"]:hover,
[data-mobile-nav="toggle"]:active,
[data-mobile-nav="files"]:active {
  background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, .06));
}
[data-mobile-nav="toggle"]:focus-visible,
[data-mobile-nav="files"]:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary, #4f6ef7);
  outline-offset: 1px;
}

/* Drawer footer action: the relocated Session log download. The Files entry
   was removed on 2026-09-17 (see
   docs/specs/2026-09-17-sidebar-files-coexistence-design.md). */
[data-mobile-nav="drawer-actions"] {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
[data-mobile-nav="session-log"] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, .12));
  border-radius: 12px;
  background: transparent;
  color: var(--dsw-alias-label-primary, inherit);
  font-family: inherit;
  font-size: 13px;
  line-height: 20px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
[data-mobile-nav="session-log"]:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, .06));
}
[data-mobile-nav="session-log"]:disabled {
  color: var(--dsw-alias-label-dimmed, rgba(0, 0, 0, .35));
  cursor: default;
}

/* Account row (customer line, 2026-09-29): circular avatar + username at the
   drawer/sidebar bottom; clicking opens a one-button 「退出登录」 menu. The
   portal merged the login entry into the workbench, so without this row the
   customer has NO logout / account-switch surface. DELIBERATELY cross-width:
   a customer's desktop browser has the same gap, so marker account is NOT
   in the desktop hide block (misc.css.ts) — a deliberate exception to the
   README's desktop no-op promise (user request, 2026-09-29). The component
   renders nothing when /__portal/api/me is unreachable (bare instances and
   signed-out states stay quiet at every width). */
[data-mobile-nav="account"] {
  position: relative;
  min-width: 0;
  max-width: 100%;
}
[data-mobile-nav="account-button"] {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
  padding: 5px 8px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: var(--dsw-alias-label-primary, inherit);
  font-family: inherit;
  font-size: 13px;
  line-height: 20px;
  text-align: left;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
[data-mobile-nav="account-button"]:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, .06));
}
[data-mobile-nav="account-button"]:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary, #4f6ef7);
  outline-offset: 1px;
}
[data-mobile-nav="account-avatar"] {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--dsw-alias-state-business-primary, #4f6ef7);
  color: var(--dsw-alias-label-primary-foreground, #fff);
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}
[data-mobile-nav="account-name"] {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
/* Host sidebar collapsed (56px icon rail): the host frame natively carries
   data-sidebar-collapsed="true" while collapsed and drops the attribute again
   on expand. Anchor on THAT attribute only — never scope these rules with
   [data-dsh-frame] / [data-pane="sidebar"]: both markers are injected by the
   @linxin666/dsh-web-all decorator plugin (setAttribute, verified in its
   client bundle), and the customer instances do NOT run it (instance frame
   attrs measured 2026-09-30: data-sidebar-collapsed + data-rightbar-collapsed
   only), so decorator-scoped selectors are silently dead in customer shape —
   the first cut of this fix anchored on [data-dsh-frame] and the rail still
   showed the overflowing name card on liliubing's instance.
   The rail's foot area is only ~40px wide — the row WITH the name inflates it
   to ~87px, clipping the avatar half outside the rail and spilling the name
   over the main pane (customer rig screenshot, 2026-09-29). Collapsed = avatar
   only, exactly like the host's own rail items: avatar center lands on the
   same 28px axis (measured on the local rig; re-measured on a customer
   instance 2026-09-30: avatar box [16,542,24,24] in the 56px rail). */
[data-sidebar-collapsed="true"] [data-mobile-nav="account-name"] {
  display: none;
}
/* The host sidebar column — the frame's first grid child (.*_sidebarCol) — is
   overflow:hidden, so a rail-opened account menu would be clipped at the 56px
   rail edge (measured: only the leftmost ~48px of the 168px popover stayed
   hit-testable; the rest fell through to the composer seat). While the menu is
   open — and only then — release the column's clip; the menu's own z-index 40
   wins the stacking over the main pane (measured on the local rig: menu fully
   hit-testable, logout button reachable; re-verified on a customer instance
   2026-09-30: overflow toggles hidden -> visible -> hidden as the menu node is
   added and removed). Same decorator-marker caveat as above: target the
   frame's first child, not [data-pane="sidebar"]. Scoped with :has to the menu
   element itself, so the host's clip is untouched in every other state. */
[data-sidebar-collapsed="true"]:has([data-mobile-nav="account-menu"]) > :first-child {
  overflow: visible;
}
/* Host-menu recipe (Menu.module.css): translucent surface fill + 40px blur,
   elevation-prominent card (hairline stroke + shadows), radius-lg; rows take
   label-primary / interactive-bg-hover so both themes resolve correctly.
   Do not substitute a hardcoded surface: --dsw-alias-bg-surface does NOT
   exist in the host token set and its light fallback renders a white card
   with white text in the dark theme (measured 2026-09-29, rig screenshot). */
[data-mobile-nav="account-menu"] {
  position: absolute;
  left: 0;
  bottom: calc(100% + 6px);
  z-index: 40;
  min-width: 160px;
  padding: 4px;
  border: 0;
  border-radius: var(--dsw-radius-lg, 12px);
  --dsw-elevation-stroke-color: var(--dsw-alias-border-l1, rgba(0, 0, 0, .04));
  box-shadow: var(--dsw-elevation-prominent, 0 0 0 .5px rgba(0, 0, 0, .04), 0 3px 8px 0 rgba(0, 0, 0, .04), 0 0 20px 0 rgba(0, 0, 0, .05));
  background: var(--dsw-menu-surface-fill, #f8f9fa94);
  -webkit-backdrop-filter: var(--dsw-menu-backdrop-filter, blur(40px) saturate(150%));
  backdrop-filter: var(--dsw-menu-backdrop-filter, blur(40px) saturate(150%));
}
[data-mobile-nav="account-logout"],
[data-mobile-nav="account-password"] {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 34px;
  padding: 6px 8px;
  border: none;
  border-radius: var(--dsw-radius-md, 8px);
  background: transparent;
  color: var(--dsw-alias-label-primary, inherit);
  font-family: inherit;
  font-size: 13px;
  line-height: 20px;
  text-align: left;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
[data-mobile-nav="account-logout"]:hover:not(:disabled),
[data-mobile-nav="account-password"]:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, .06));
}
[data-mobile-nav="account-logout"]:focus-visible,
[data-mobile-nav="account-password"]:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary, #4f6ef7);
  outline-offset: 1px;
}
[data-mobile-nav="account-logout"]:disabled {
  color: var(--dsw-alias-label-dimmed, rgba(0, 0, 0, .35));
  cursor: default;
}

/* Password-change dialog (2026-09-29 late, owner request): opened from the
   account menu; a centered modal that stays BELOW the settled-toast band
   (1500) and ABOVE the host menu band (1100) and the mobile drawer's raised
   rules (1400). The card reuses the host menu-surface recipe so it reads
   correctly in both themes; the overlay dims the page (design: center card,
   per owner ask). Fixed positioning is deliberate — the rig asserts viewport
   centering (desktop.password-dialog) because the account row lives inside
   the sidebar/drawer subtree. */
[data-mobile-nav="account-password-overlay"] {
  position: fixed;
  inset: 0;
  z-index: 1450;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 17, 20, .38);
}
[data-mobile-nav="account-password-dialog"] {
  width: 100%;
  max-width: 340px;
  box-sizing: border-box;
  padding: 18px 16px 14px;
  border-radius: var(--dsw-radius-lg, 12px);
  --dsw-elevation-stroke-color: var(--dsw-alias-border-l1, rgba(0, 0, 0, .04));
  box-shadow: var(--dsw-elevation-prominent, 0 0 0 .5px rgba(0, 0, 0, .04), 0 3px 8px 0 rgba(0, 0, 0, .04), 0 0 20px 0 rgba(0, 0, 0, .05));
  background: var(--dsw-menu-surface-fill, #f8f9fa94);
  -webkit-backdrop-filter: var(--dsw-menu-backdrop-filter, blur(40px) saturate(150%));
  backdrop-filter: var(--dsw-menu-backdrop-filter, blur(40px) saturate(150%));
  color: var(--dsw-alias-label-primary, inherit);
}
[data-mobile-nav="account-password-dialog"] h3 {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
}
[data-mobile-nav="password-old"],
[data-mobile-nav="password-new"],
[data-mobile-nav="password-confirm"] {
  display: block;
  width: 100%;
  box-sizing: border-box;
  margin: 0 0 10px;
  padding: 10px 12px;
  border-radius: var(--dsw-radius-md, 8px);
  border: 1px solid color-mix(in srgb, var(--dsw-alias-label-primary, #000) 22%, transparent);
  background: transparent;
  color: var(--dsw-alias-label-primary, inherit);
  font-family: inherit;
  /* ≥16px：iOS 聚焦输入框不触发页面自动缩放 */
  font-size: 16px;
  outline: none;
}
[data-mobile-nav="password-old"]:focus,
[data-mobile-nav="password-new"]:focus,
[data-mobile-nav="password-confirm"]:focus {
  border-color: var(--dsw-alias-state-business-primary, #4f6ef7);
}
[data-mobile-nav="password-error"] {
  margin: 0 0 10px;
  font-size: 12.5px;
  line-height: 1.5;
  color: #d64545;
}
[data-mobile-nav="password-updated"] {
  margin: 0 0 10px;
  font-size: 12.5px;
  line-height: 1.5;
  color: #2f9e44;
}
[data-mobile-nav="password-actions"] {
  display: flex;
  gap: 10px;
  margin-top: 2px;
}
[data-mobile-nav="password-cancel"],
[data-mobile-nav="password-submit"] {
  flex: 1;
  padding: 10px;
  border-radius: var(--dsw-radius-md, 8px);
  border: none;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
[data-mobile-nav="password-cancel"] {
  background: transparent;
  color: var(--dsw-alias-label-primary, inherit);
  border: 1px solid color-mix(in srgb, var(--dsw-alias-label-primary, #000) 22%, transparent);
}
[data-mobile-nav="password-cancel"]:disabled {
  opacity: .55;
  cursor: default;
}
[data-mobile-nav="password-submit"] {
  background: var(--dsw-alias-state-business-primary, #4f6ef7);
  color: var(--dsw-alias-label-primary-foreground, #fff);
}
[data-mobile-nav="password-submit"]:disabled {
  opacity: .6;
  cursor: default;
}

/* File download: the customer's only way to take a container file onto the
   device (host Web has no download surface; iOS standalone PWA ignores
   anchor downloads, so the control hands the file to the Web Share sheet).
   Two forms — compact in the document toolbar, prominent in the
   unpreviewable empty state. DELIBERATELY cross-width: a customer's desktop
   browser has the same gap, so this marker is NOT in the desktop hide
   block. Colors and states follow the header controls above. */
[data-mobile-nav="download"] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 28px;
  height: 28px;
  flex: none;
  padding: 0 4px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--dsw-alias-label-secondary, inherit);
  font-family: inherit;
  font-size: 13px;
  line-height: 20px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
[data-mobile-nav="download"]:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, .06));
}
[data-mobile-nav="download"]:disabled {
  opacity: .55;
  cursor: default;
}
[data-mobile-nav="download"]:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary, #4f6ef7);
  outline-offset: 1px;
}
[data-mobile-nav="download"][data-state="error"] {
  color: var(--dsw-alias-state-error-primary, #b91c1c);
}
[data-mobile-nav="download-empty"] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 40px;
  padding: 0 16px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, .12));
  border-radius: 12px;
  background: transparent;
  color: var(--dsw-alias-label-primary, inherit);
  font-family: inherit;
  font-size: 13px;
  line-height: 20px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
[data-mobile-nav="download-empty"]:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, .06));
}
[data-mobile-nav="download-empty"]:disabled {
  opacity: .55;
  cursor: default;
}
[data-mobile-nav="download-empty"][data-state="error"] {
  color: var(--dsw-alias-state-error-primary, #b91c1c);
}
[data-mobile-nav="download-label"] {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 12em;
}

/* Delivery-card download (customer line, 2026-09-29): the chat card's own
   control. The host's open-in-app control on the same card is a dead button
   in the container shape and is shadowed in customer mode (deployment-mode);
   geometry follows the host's compact file actions (28px, radius 8). */
[data-mobile-nav="download-card"] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--dsw-alias-label-secondary, inherit);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
[data-mobile-nav="download-card"]:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, .06));
}
[data-mobile-nav="download-card"]:disabled {
  opacity: .55;
  cursor: default;
}
[data-mobile-nav="download-card"]:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary, #4f6ef7);
  outline-offset: 1px;
}
[data-mobile-nav="download-card"][data-state="error"] {
  color: var(--dsw-alias-state-error-primary, #b91c1c);
}

/* Settled-delivery toast (both download surfaces): the share sheet and the
   streamed download are silent by construction, so a settled success earns
   one short confirmation (2026-09-29 customer report「下载成功了也没有提示」).
   Above the fork's top band (1250) and the host's dialog band (1400s);
   pointer-events stay off so it never eats a tap. */
[data-mobile-nav="toast"] {
  position: fixed;
  left: 50%;
  bottom: calc(104px + env(safe-area-inset-bottom, 0px));
  z-index: 1500;
  max-width: min(86vw, 420px);
  padding: 9px 14px;
  border-radius: 10px;
  background: rgba(28, 28, 32, .92);
  color: #fff;
  font-family: inherit;
  font-size: 13px;
  line-height: 20px;
  text-align: center;
  overflow-wrap: anywhere;
  opacity: 0;
  visibility: hidden;
  transform: translate(-50%, 8px);
  pointer-events: none;
  transition: opacity 180ms ease, transform 180ms ease, visibility 0s linear 180ms;
}
[data-mobile-nav="toast"][data-visible="true"] {
  opacity: 1;
  visibility: visible;
  transform: translate(-50%, 0);
  transition: opacity 180ms ease, transform 180ms ease, visibility 0s;
}
@media (prefers-reduced-motion: reduce) {
  [data-mobile-nav="toast"] { transition: none; }
}

[data-mobile-nav="delete-confirm-title"] {
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
  color: var(--dsw-alias-text-primary, rgb(15, 17, 21));
}
[data-mobile-nav="delete-confirm-desc"] {
  font-size: 12px;
  line-height: 17px;
  color: var(--dsw-alias-label-secondary, inherit);
}
[data-mobile-nav="delete-confirm-actions"] {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 2px;
}
[data-mobile-nav="delete-confirm-actions"] > button {
  height: 36px;
  padding: 0 14px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, .12));
  border-radius: 18px;
  background: transparent;
  color: var(--dsw-alias-label-primary, inherit);
  font-family: inherit;
  font-size: 14px;
  line-height: 20px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
[data-mobile-nav="delete-confirm-yes"] {
  border-color: transparent !important;
  background: var(--dsw-alias-state-error-primary, #b91c1c) !important;
  color: #ffffff !important;
}
[data-mobile-nav="delete-confirm-actions"] > button:disabled {
  opacity: .55;
  cursor: default;
}
[data-mobile-nav="delete-error"] {
  width: 100%;
  font-size: 14px;
  line-height: 20px;
  color: var(--dsw-alias-state-error-primary, #b91c1c);
}

/* Centered frosted-glass modal for the delete confirm / error card: the
   backdrop is a flex positioning container (centering + 16px inset padding)
   and the card rides inside it as a static child (session-menu.ts appends
   the card INTO the backdrop for exactly this reason). Look baseline = the
   host ⋯ menu's portal root, measured 2026-09-24: translucent
   rgba(248,249,250,.58) fill with blur(40px) saturate(1.5) frosted glass,
   16px radius, hairline + soft shadow. Geometry baseline = the host Dialog,
   measured the same day: centered modal, 16px/500 title, 36px pill buttons,
   solid-fill primary. [hidden] keeps the error line out of layout until a
   failure lands. */
[data-mobile-nav="delete-dialog-backdrop"] {
  position: fixed;
  inset: 0;
  z-index: 55;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, .4);
  animation: dsh-web-mobile-fade .2s var(--ds-ease-in-out, ease-in-out);
}
[data-mobile-nav="delete-dialog"] {
  position: static;
  width: min(420px, calc(100vw - 32px));
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: 16px;
  background: rgba(248, 249, 250, .58);
  -webkit-backdrop-filter: blur(40px) saturate(1.5);
  backdrop-filter: blur(40px) saturate(1.5);
  box-shadow: rgba(0, 0, 0, .04) 0 0 0 .5px, rgba(0, 0, 0, .04) 0 3px 8px 0, rgba(0, 0, 0, .05) 0 0 20px 0;
}
@media (prefers-reduced-motion: reduce) {
  [data-mobile-nav="delete-dialog-backdrop"],
  [data-mobile-nav="delete-dialog"] {
    animation: none !important;
  }
}

/* ---------- popover band above the open drawer (mobile only) ----------
   The host portals its menus to <body> as position: fixed with z-index 1100,
   while the drawer column carries 1300 and our backdrop 1250. A menu opened
   from inside the drawer therefore painted UNDER both: measured 2026-09-14 at
   390px on the session row's ⋯ menu — menu rect [160,454,218,168] z1100, and
   elementFromPoint at its centre AND at both of its ends returned drawer
   elements, so the whole menu was unreachable and the row could not be
   renamed/forked/archived/deleted from the phone (the second half of the
   owner's report: the popup the ⋯ opens is pressed under the drawer).
   The raise is gated on the open drawer: our backdrop makes that the only
   state in which a menu can be opened from the drawer, so the closed-drawer
   and desktop stacks keep the host's own ordering.
   The plugin's own confirm card sits in the same band: it mounts on
   document.body (NOT in the frame — see session-menu.ts, which appends the
   backdrop and the card there so the third-party dismiss shim's capture-phase
   click chain cannot swallow its buttons) and carried the base z 55/56, so the
   drawer covered its left 272px (measured: elementFromPoint inside that band hit
   the drawer's own button, and the confirm card is 358px wide starting at x=8). */
@media (max-width: 1023px) and (pointer: coarse) {
  body:has([data-mobile-nav="frame"]:not([data-sidebar-collapsed])) [role="menu"] {
    z-index: 1400 !important;
  }
  /* Host modal dialogs (workspace rename, and any future dialog of the same
     shape) portal to a direct body child that carries the stacking context:
     body > div { position: fixed; z-index: 1000 } wrapping
     [role="dialog"][aria-modal="true"] (inner z-index: 1 — raising the dialog
     itself is useless, it only sorts inside that root).
     NOTE (2026-09-23): the hashes once recorded here (_root_w1urq_2 /
     _dialog_w1urq_22) are gone from both 0.1.7-alpha.1 and alpha.2, so this
     comment anchors on the SHAPE only — which is what the rule below already
     matches. Do not reintroduce a hash here without re-measuring.
     Measured 2026-09-19: with the drawer open (column z 1300) the workspace
     Rename dialog sat entirely under it and needed the drawer closed first.
     Raise the portal root, not the dialog.
     GATE (2026-09-25, real device): the gate is OUR BACKDROP'S PRESENCE, not
     the drawer-open marker. Marker and paint disagree for the whole close
     transition — the backdrop fades over .2s and is removed 260ms after the
     marker flips (overlay-backdrop-fab.ts), the column transitions .28s
     (layout.css.ts) and React swaps the pane subtree ~200ms late — so a
     marker-gated raise went dark inside that window and the drawer band
     covered any open modal. Measured on the reporter's phone (Android 16
     WebView) with the shortcut modal open: forcing data-sidebar-collapsed
     dropped this root 1400 -> 1000 and made elementsFromPoint(0.85w, .30h)
     return [data-mobile-nav="backdrop"] — rgba(0,0,0,.45) over the modal's
     white = luminance 141, matching the reporter's recording (140 behind a
     280px drawer edge). That is the "快捷键弹层抽搐/闪" report: a ~200-280ms
     dark frame with the drawer over the shortcut modal, not a compositing
     tear. The backdrop's presence IS the drawing condition, so gating on it
     has no such window; with no backdrop the host's own ordering stands (a
     menu opened inside a modal still sorts above it). Our own delete backdrop
     matches this rule too since the 2026-09-24 centered rework (its direct
     child card carries role=dialog) — harmlessly: it sets the same 1400 the
     dedicated rule below sets. */
  body:has([data-mobile-nav="backdrop"])
    > div:has(> [role="dialog"][aria-modal="true"]) {
    z-index: 1400 !important;
  }
  [data-mobile-nav="delete-dialog-backdrop"] {
    z-index: 1400 !important;
  }
  [data-mobile-nav="delete-dialog"] {
    z-index: 1401 !important;
  }
  /* dsh-usage-stats portals its panel to <body> as position: fixed with
     z-index 100 (desktop-designed; the drawer does not exist there). With our
     drawer open (column z 1300) the「用量/余额」panel sat under it: measured
     2026-09-20 at 390px — panel rect [12,91,366,625] z100 vs drawer 280px wide
     z1300, and elementFromPoint at the panel's centre AND its left corners
     returned drawer elements, so only a ~98px strip on the right stayed
     reachable. The plugin also unmounts the panel when the drawer closes
     (Escape-linked dismissal) and the badge only renders in the open drawer,
     so the open-drawer gate covers the panel's only reachable state; the
     closed-drawer and desktop stacks keep the plugin's own ordering. */
  body:has([data-mobile-nav="frame"]:not([data-sidebar-collapsed]))
    [data-usage-stats-panel] {
    z-index: 1400 !important;
  }
  /* AppFrame overlayLayer band — the class self-fix of our own layering
     contract (NOT a per-plugin adaptation): plugin and host sheets portal
     INTO the AppFrame overlay layer (position: absolute; z-index 20 — its
     own stacking context), so no z-index on a sheet itself can out-rank the
     drawer column's 1300 in the root context, and every sheet opened from
     the drawer landed behind it. Measured 2026-09-22 at 390px with the
     drawer open: a probe sheet inside the layer stayed hit-blocked by
     drawer elements at z auto AND z 9999 alike, and only raising the layer
     ROOT revealed it (elementFromPoint). Raise the stacking root, not the
     children — the same shape as the dialog portal-root raise above. The
     body-ported bands keep their own raises (menus 1100, dialog root 1000,
     usage-stats panel 100): each is a per-surface adaptation patch for a
     portal OUTSIDE this layer. Closed-drawer and desktop stacks keep the
     host's own ordering. */
  body:has([data-mobile-nav="frame"]:not([data-sidebar-collapsed]))
    [class*="_overlayLayer"] {
    z-index: 1400 !important;
  }
  /* 0.1.7 fullscreen sidebar panels (the sidebar terminal / files / preview /
     browser tabs) state the dockkit cell at z 40 — the host sets
     --dsh-dockkit-dock-layer: 40 on .panel[data-sidebar-right-panel=fullscreen]
     — which outranks the
     host's own overlay layer (20) and our FAB (21). Measured 2026-09-23 at
     390px with the terminal panel open: elementFromPoint at the FAB's centre
     returned a panel child, and a real tap on it left the drawer closed — the
     phone lost its only way back to navigation (the FAB is the screen's only
     control once a panel owns the main area, see overlay-backdrop-fab.ts).
     Raise OUR two surfaces for that state, the same "raise the root, not the
     children" shape as above; the FAB stays in the below-the-drawer band (55)
     so an open drawer keeps covering it. Gate on the open attribute: the
     presentation attribute alone survives a closed panel. Closed-panel,
     docked-panel (dock layer 10) and desktop stacks keep the host's order. */
  body:has([data-sidebar-right-open][data-sidebar-right-panel="fullscreen"]) [data-mobile-nav="fab"] {
    z-index: 55 !important;
  }
  body:has([data-sidebar-right-open][data-sidebar-right-panel="fullscreen"])
    [class*="_overlayLayer"] {
    z-index: 1400 !important;
  }
}

/* Floating fallback button (hero / blank phases without a session header).
   Top aligns with the session header's toggle row (that row sits 12px below
   the frame's safe-area padding); when the client has set viewport-fit=cover
   the safe-area inset moves it below the notch too. */
[data-mobile-nav="fab"] {
  position: absolute;
  top: calc(env(safe-area-inset-top, 0px) + 12px);
  left: 10px;
  z-index: 21;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  padding: 0;
  border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, .12));
  border-radius: 50%;
  background: var(--dsw-alias-button-floating-fill, #ffffff);
  color: var(--dsw-alias-label-primary, inherit);
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(0, 0, 0, .18);
  -webkit-tap-highlight-color: transparent;
}
[data-mobile-nav="fab"]:hover {
  background: var(--dsw-alias-button-floating-hover, rgba(0, 0, 0, .08));
}
[data-mobile-nav="fab"]:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary, #4f6ef7);
  outline-offset: 2px;
}

/* Dimmed backdrop under the open drawer; above every column, below the drawer.
   z 1250: 0.1.5 pins its native sidebarCol at z-index:1100 and paints mid
   layers up to that band; the backdrop must sit above the host stack
   (below the drawer's 1300) so the dim covers the content area on every
   host generation. Keep in sync with the drawer z in layout.css.ts. */
[data-mobile-nav="backdrop"] {
  position: absolute;
  inset: 0;
  z-index: 1250;
  background: rgba(0, 0, 0, .45);
  cursor: pointer;
  animation: dsh-web-mobile-fade .2s var(--ds-ease-in-out, ease-in-out);
  /* Fade-out twin of the mount animation: the task eases the dimming away
     (inline opacity 0 + pointer-events none) and removes the element after
     the fade. Also used by the gesture layer so the backdrop fades in step
     with a close-follow commit's slide-out. */
  transition: opacity .2s var(--ds-ease-in-out, ease-in-out);
  -webkit-tap-highlight-color: transparent;
}
@keyframes dsh-web-mobile-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  [data-mobile-nav="backdrop"] {
    animation: none !important;
    transition: none !important;
  }
}
/* Settings sheet entrance: the official dialog mounts with no animation at
   all, so it snaps in. A slight rise/scale reads as a proper sheet.
   No opacity arm (issue #124, 2026-09-25): checker scene 4 screencast caught
   the fade double-exposing the still-open drawer underneath the panel
   (frame a005) — sliding in fully opaque keeps the motion, drops the bleed. */
@keyframes dsh-web-mobile-sheet-in {
  from {
    transform: translateY(14px) scale(.98);
  }
  to {
    transform: none;
  }
}
/* Preview sheet rise: the aionui preview column opens as a bottom sheet. */
@keyframes dsh-web-mobile-sheet-up {
  from {
    opacity: 0;
    transform: translateY(28px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

`
