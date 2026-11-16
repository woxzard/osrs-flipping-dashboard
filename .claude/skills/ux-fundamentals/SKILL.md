---
name: ux-fundamentals
description: The owner's UX rules for any project with screens (web or mobile) - navigation and back behaviour, scroll and state restoration, returning to where a task started, feedback and loading, forms on a phone, touch targets, errors, empty states, undo, accessibility. Use when designing, building, changing or reviewing any screen, page, form, list, dialog or navigation flow, and before opening a PR that changes what the user sees or how they move between screens.
---

# UX fundamentals

<!-- Master copy: templates/project-starter/.claude/skills/ux-fundamentals/SKILL.md in the knowledge repo. New rules go there first (section "Owner's rules" for ones the owner found), then get copied into projects. Keep each rule to one line of rule + one line of how. -->

Apply these to every screen you build or change. They're defaults: if the spec or `docs/decisions.md` says otherwise, follow that. If a rule would cost a lot to meet, say so in the batch plan instead of skipping it quietly.

## Owner's rules (found while testing real projects)
These come first because they've already bitten us.

1. **Remember scroll position when going back.** Returning to a previous screen (back button, back gesture, closing a detail view) puts the user exactly where they were in the list, not at the top.
   - How: the browser restores scroll only if the content is already there. Lists loaded after the page renders, lists inside their own scrolling container, and screens that re-mount need it done by hand: save `scrollTop` per screen (e.g. in `sessionStorage`, keyed by route + filters) and restore it after the data has rendered. Prefer opening details as a route the user goes *back* from, or as a sheet over the list, so the list never unmounts.
   - Check: scroll far down a list, open an item, go back → same item visible. Also after editing that item and saving.
2. **When a task finishes, return to where it started.** If the user opens something from screen A, completes it and the view closes, they land back on screen A in the same state, not on a default or "home" screen. Example: confirming an item's calories from a list in Settings returns to that Settings list (same scroll, same filter), not to Pantry.
   - How: never hard-code the redirect after save/cancel/delete. Pass the origin (e.g. `?returnTo=/settings/calories?filter=unconfirmed`) or use history back when the previous entry is the origin; fall back to the item's natural parent only when opened from a direct link. Same item reachable from two places → two correct return paths. Accept only the app's own paths: browsers drop tabs and line breaks, so `/\t/evil.com` reads as `//evil.com`; check with `new URL(path, base).origin` and refuse control characters and backslashes. After a delete, *replace* the deleted screen in history so the back gesture can't land on it.
   - Check: for every screen reachable from more than one place, open it from each and finish (save, cancel, delete); each returns to its own origin.
3. **Spot duplicates before adding something new.** When the user adds an item to a shared list (an ingredient, a contact, a tag), or an import would, look for one that's probably the same and offer it: "Already on your list: garlic · Use garlic / Keep as new".
   - How: cheap rules before AI: plurals, describing words ("fresh", "chopped"), parts ("cloves"), small typos (none under 5 letters: beef/beet), the last word only as "similar" ("coconut milk" isn't milk). On **Use**, keep the typed name as another name (not for typos) so it matches next time; offer Undo.
   - Check: plural, describing word, typo and a truly new name: the first three are offered, the last adds without fuss; nothing is merged without a tap.
4. **Confirmation messages go away on their own.** A toast like "Saved" or "Moved 37 ingredients" disappears after a couple of seconds (about 2.5 s) and never waits to be closed. With Undo or another button, give it a bit longer (about 5 s) so there's time to tap.
   - How: one shared toast component with the timings in one place; a new message replaces the old one and restarts the timer; the timer pauses only while an Undo is running.
   - Check: trigger a plain toast and one with Undo, don't touch them: both are gone within ~3 s and ~5 s.

## Navigation and state
- **The URL holds the screen's state:** tab, filter, sort, search text, selected date, open item. Back, refresh and a shared link all bring back the same view.
- **Back does what the user expects:** it undoes the last navigation, never logs out or exits mid-flow. On phones, a full-screen sheet or multi-step flow closes/steps back with the back gesture.
- **Refresh and direct links work on every screen:** no screen depends on state from the previous one only.
- **Show where the user is:** current tab/section highlighted; detail screens have a visible way back with the parent's name when it helps ("‹ Settings").
- **Don't lose what the user typed:** keep drafts when they navigate away and come back, or warn before leaving with unsaved changes. Autosave beats a warning.
- **After creating something, show it:** land on or highlight the new item in its list, scrolled into view.
- **Working through a queue? Offer "Save & next".** When the user is reviewing many items (e.g. unconfirmed calories), let them go to the next one without returning to the list each time, and show progress ("3 of 12").

## Feedback and system status
- **Every tap answers within ~100 ms:** pressed state, then the result or a busy state.
- **Loading:** show nothing for the first ~300 ms (avoids flashing), then skeletons shaped like the content. Never a blank screen; never block the whole screen for one part loading.
- **Buttons that send something** show a busy state and are disabled until done: no double submits, no duplicate items.
- **Optimistic updates** for quick, likely-to-succeed actions (tick, toggle, reorder): update at once, roll back with a message if the server says no.
- **Confirm results the user can't see:** a short toast ("Saved", "Added to list") when the change isn't visible on screen. Don't toast what's obvious.
- **Slow or offline:** say so plainly, keep what they entered, retry when possible.

## Errors and empty states
- **Error messages say what happened and what to do,** in plain language, next to the cause. No codes or stack traces for the user.
- **Never clear a form on error.** Keep every value; move focus to the first problem.
- **Validate when the user leaves a field or submits,** not on every keystroke; clear the error as soon as it's fixed.
- **Empty states explain and offer the next step:** "No meals planned this week — Plan a meal", not a blank area. A search with no results names the search and offers to clear it.

## Undo and destructive actions
- **Undo over "Are you sure?"** for anything reversible: act, then show "Deleted · Undo" for about 5 seconds (owner's rule 4).
- **Confirm only what can't be undone,** naming the thing and the consequence ("Delete 'Chicken adobo' and its 4 planned meals?"). The confirm button says the action ("Delete"), not "OK".
- **Destructive actions look different and sit apart** from the main action, so a slip of the thumb can't trigger them.

## Forms on a phone
- **The right keyboard:** `type`/`inputmode` for numbers, decimals, email, phone, search; `autocomplete` for names, addresses, one-time codes; `enterkeyhint` ("next", "done", "search").
- **Input text at least 16 px** so iOS Safari doesn't zoom in on focus.
- **Visible labels,** not placeholder-only. Units next to the field (g, kcal, ₱).
- **Good defaults and memory:** pre-fill the likely value, remember the last one used, put the most common choice first.
- **The keyboard never hides the field being typed in or the submit button;** scroll the field into view.
- **Small numbers get steppers or quick-pick chips** instead of typing (servings, quantities).
- **Ask only for what's needed now;** optional fields collapsed or later.

## Touch and layout
- **Tap targets at least 44×44 px** with ~8 px between them (Apple 44 pt, Material 48 dp). Make the whole row tappable, not just the text.
- **Main actions within thumb reach:** bottom of the screen on phones; a sticky bottom bar for the screen's primary action.
- **Respect safe areas** (notch, home indicator): `viewport-fit=cover` plus `env(safe-area-inset-*)` padding on fixed bars.
- **Use `dvh`/`svh`, not `100vh`,** for full-height layouts on mobile browsers.
- **Works at 320 px wide** and with large system text: no horizontal scrolling, long names wrap or truncate with the full text reachable.
- **Nothing depends on hover;** long-press and swipe are shortcuts, never the only way.
- **No layout jumps:** reserve space for images and content that loads later, so taps don't land on the wrong thing.
- **Nested scroll areas** use `overscroll-behavior: contain` so scrolling a sheet doesn't scroll the page behind it.

## Clarity and consistency
- **Buttons say what they do:** "Save meal", "Add to groceries", not "OK" or "Submit".
- **Same thing, same name, same place, same icon** across the app. Icons get a text label unless universal (search, close, back).
- **One primary action per screen,** visually obvious.
- **Show, don't make them remember:** recent and frequent items first, search that tolerates typos, choices from a list instead of typing.
- **Local formats:** the project's currency, units, time zone and date style (defaults in `CLAUDE.md`); relative dates where they read better ("Today", "Tomorrow").

## Accessibility (also makes it better for everyone)
- **Contrast:** text at least 4.5:1 (3:1 for large text), icons and borders 3:1, in light and dark mode.
- **Never colour alone:** pair colour with text or an icon (errors, status, required).
- **Zoom is never disabled;** layouts survive 200% text size.
- **Real elements:** buttons are `<button>`, links are `<a>`, inputs have labels; icon-only buttons have an accessible name.
- **Focus:** visible focus ring; dialogs move focus in, trap it, and return it to what opened them; everything works with a keyboard.
- **Motion:** short (150–300 ms) and purposeful; respect `prefers-reduced-motion`.

## Speed is UX
- Fast first screen: show the useful part first, load the rest after.
- Prefetch the likely next screen (list → detail).
- Cache what was just seen so going back is instant (ties in with rule 1).

## Before opening a PR that changes screens
Run through these on a phone-sized viewport (end-to-end checks where possible, see the `e2e-check` skill):
- [ ] Back from every new or changed screen returns to the same place and scroll position.
- [ ] Every save/cancel/delete returns to where the task started, from each entry point; a `returnTo`/`from` with a tab or `//` is refused.
- [ ] Adding a new item to a shared list offers a probable duplicate (plural, typo) before creating it.
- [ ] Refresh on the screen keeps tabs, filters and search.
- [ ] Loading, empty, error and slow/offline states exist and read well.
- [ ] No double submit; destructive actions have undo or a clear confirm.
- [ ] Confirmation toasts disappear on their own after a couple of seconds (a bit longer with Undo).
- [ ] Right keyboard per field; nothing hidden behind the keyboard; inputs ≥16 px.
- [ ] Tap targets ≥44 px; works at 320 px wide, in dark mode, with large text.
- [ ] Mention in the PR's test checklist anything here that only a real phone can confirm.

## Sources
Nielsen Norman Group's 10 usability heuristics; Apple Human Interface Guidelines; Material Design 3; WCAG 2.2 (AA); web.dev guidance on forms, layout shift and the mobile viewport.
