# PICUFLA — Screen-by-Screen UI Audit

## Audit Criteria
- **Spacing**: Consistent, well-balanced padding/margins
- **Typography**: Proper hierarchy, font usage
- **Visual Balance**: Elements feel intentional, not scattered
- **Card Usage**: Proper elevation, radius, shadow
- **Empty States**: Helpful, not just "Nothing here"
- **Loading States**: Skeleton/progress, not just spinner
- **Error States**: Clear, actionable, not blocking
- **Accessibility**: Labels, contrast, touch targets
- **Responsiveness**: Adapts to different screen sizes

---

## 1. LoginScreen (`src/screens/LoginScreen.tsx`)

| Criteria | Rating | Issues |
|----------|--------|--------|
| Spacing | ⚠️ | Good vertical rhythm, but illustration area + form card overlap could be tighter |
| Typography | ✅ | Proper use of Serif for title, Sans for body |
| Visual Balance | ⚠️ | Emoji (🌿) as logo feels cheap. Use a proper SVG or Lottie animation |
| Card Usage | ⚠️ | `formCard` background blends with `illustrationArea` — low contrast between sections |
| Empty States | N/A | |
| Loading States | ⚠️ | Full-screen spinner while fonts load (will be fixed by font hoisting) |
| Error States | N/A | No error states on this screen |
| Accessibility | ❌ | No `accessibilityLabel` on buttons, no `accessibilityRole` |
| Responsiveness | ✅ | Works on different sizes via ScrollView |

**Priority fixes**: Replace emoji with SVG/Lottie, add contrast between sections, accessibility labels

---

## 2. EmailRegisterScreen (`src/screens/EmailRegisterScreen.tsx`)

| Criteria | Rating | Issues |
|----------|--------|--------|
| Spacing | ✅ | Clean form spacing |
| Typography | ✅ | Good label/input hierarchy |
| Visual Balance | ⚠️ | Password validation errors stack vertically — push layout down when visible (can cause scroll jump) |
| Card Usage | ✅ | Input fields are properly styled |
| Empty States | N/A | |
| Loading States | ✅ | Button shows spinner |
| Error States | ✅ | Inline field errors + submit error box |
| Accessibility | ❌ | No labels on TextInput, no `accessibilityLabel` on eye toggle |
| Responsiveness | ✅ | |

**Priority fixes**: Fix scroll-jump on error, accessibility labels on inputs and icons

---

## 3. EmailLoginScreen (`src/screens/EmailLoginScreen.tsx`)

| Criteria | Rating | Issues |
|----------|--------|--------|
| Spacing | ✅ | Good |
| Typography | ✅ | Good |
| Visual Balance | ⚠️ | Input fields don't show focused state (no border color change) |
| Card Usage | ✅ | |
| Loading States | ✅ | |
| Error States | ❌ | Generic "Incorrect email or password" masks network errors |
| Accessibility | ❌ | Missing labels on all interactive elements |
| Responsiveness | ✅ | |

**Priority fixes**: Add focused input state (border color), differentiate error types, accessibility

---

## 4. VerifyEmailScreen (`src/screens/VerifyEmailScreen.tsx`)

| Criteria | Rating | Issues |
|----------|--------|--------|
| Spacing | ✅ | Well-centered content |
| Typography | ✅ | Good hierarchy |
| Visual Balance | ⚠️ | Envelope emoji (✉️) again — use Feather icon or illustration |
| Card Usage | ⚠️ | `emailPill` is just background color — could use card styling |
| Empty States | N/A | |
| Loading States | ✅ | |
| Error States | ✅ | Success/error message box |
| Accessibility | ⚠️ | Buttons have text labels (good), but no `accessibilityRole` |
| Responsiveness | ✅ | |

**Priority fixes**: Replace emoji with Feather icon plus illustration

---

## 5. VerifyOtpScreen (`src/screens/VerifyOtpScreen.tsx`)

| Criteria | Rating | Issues |
|----------|--------|--------|
| Spacing | ✅ | Good |
| Typography | ✅ | Good |
| Visual Balance | ⚠️ | OTP input with `letterSpacing: 8` looks good but cursor position is awkward |
| Card Usage | ✅ | |
| Loading States | ✅ | Full-screen spinner during processing |
| Error States | ✅ | Message box with icon |
| Accessibility | ❌ | OTP input needs `accessibilityLabel="One-time password"` |
| Responsiveness | ⚠️ | Fixed max-width (380) may leave gaps on tablets |

**Priority fixes**: OTP input UX improvement, accessibility label

---

## 6. ForgotPasswordScreen (`src/screens/ForgotPasswordScreen.tsx`)

| Criteria | Rating | Issues |
|----------|--------|--------|
| Spacing | ✅ | Clean |
| Typography | ✅ | Good |
| Visual Balance | ⚠️ | `iconCircle` uses `Colors.green100` — low contrast against parchment bg |
| Card Usage | ✅ | |
| Loading States | ✅ | |
| Error States | ✅ | Inline error box with icon |
| Accessibility | ❌ | Missing labels |
| Responsiveness | ✅ | |

**Priority fixes**: Increase icon circle contrast, accessibility

---

## 7. ChangePasswordScreen (`src/screens/ChangePasswordScreen.tsx`)

| Criteria | Rating | Issues |
|----------|--------|--------|
| Spacing | ✅ | Clean |
| Typography | ✅ | Good |
| Visual Balance | ✅ | Good "Done" state after success |
| Card Usage | ✅ | |
| Loading States | ✅ | |
| Error States | ✅ | |
| Accessibility | ❌ | Missing labels |
| Responsiveness | ✅ | |

**Priority fixes**: Accessibility labels on password fields and eye toggles

---

## 8. SetupProfileScreen (`src/screens/SetupProfileScreen.tsx`)

| Criteria | Rating | Issues |
|----------|--------|--------|
| Spacing | ⚠️ | Danger zone feels crammed at bottom |
| Typography | ✅ | Good |
| Visual Balance | ✅ | Clean layout |
| Card Usage | ⚠️ | No cards — flat list of settings could use grouping |
| Empty States | N/A | |
| Loading States | ✅ | |
| Error States | ✅ | Alert-based |
| Accessibility | ⚠️ | Avatar picker needs label |
| Responsiveness | ✅ | |

**Priority fixes**: Group settings into cards, accessibility on avatar picker

---

## 9. ScanScreen (`src/screens/ScanScreen.tsx`)

| Criteria | Rating | Issues |
|----------|--------|--------|
| Spacing | ⚠️ | Bottom panel takes 40% — could be more compact |
| Typography | ✅ | Good |
| Visual Balance | ❌ | Camera fills top, bottom panel is solid — feels disconnected. No flash toggle. Stray "arrow-up"/"arrow-down" icons in search bar (wrong screen!) |
| Card Usage | ⚠️ | No cards — flat layout |
| Loading States | ✅ | |
| Error States | ⚠️ | Error box at bottom — could be more visible |
| Accessibility | ❌ | No labels on camera controls, no hint for what to do |
| Responsiveness | ⚠️ | Camera overlay corners positioned with absolute values (60, 24) — may break on notched devices |

**Priority fixes**: Full redesign planned for Sprint 3. Key: fullscreen camera, glassmorphic controls, proper flash toggle, remove stray icons

---

## 10. IdentificationResultScreen (`src/screens/IdentificationResultScreen.tsx`)

| Criteria | Rating | Issues |
|----------|--------|--------|
| Spacing | ⚠️ | Cramped on smaller screens — scrollable but tight |
| Typography | ✅ | Good hierarchy with Serif for name, Sans for details |
| Visual Balance | ⚠️ | Draggable image is clever but feels janky — snap points aren't smooth |
| Card Usage | ✅ | Care book card is well done |
| Loading States | ✅ | |
| Error States | ✅ | Alert-based for save errors |
| Accessibility | ❌ | Drag handle has no label, PanResponder not accessible |
| Responsiveness | ⚠️ | `MAX_IMAGE_HEIGHT = SCREEN_HEIGHT * 0.55` may be too tall on large screens |

**Priority fixes**: Smooth drag behavior, accessibility on drag handle, add toxicity warning section

---

## 11. CollectionScreen (`src/screens/CollectionScreen.tsx`)

| Criteria | Rating | Issues |
|----------|--------|--------|
| Spacing | ✅ | Good grid spacing |
| Typography | ✅ | Good hierarchy |
| Visual Balance | ⚠️ | Stray "arrow-up"/"arrow-down" icons in search bar (do nothing) |
| Card Usage | ✅ | Plant cards look good with shadow |
| Empty States | ⚠️ | Nice visual (feather icon + message) but could have a CTA that works better |
| Loading States | ✅ | |
| Error States | ⚠️ | Silent catch on network error — falls back to cache but no user feedback |
| Accessibility | ❌ | No labels on filter button, no card accessibility |
| Responsiveness | ✅ | 2-column grid adapts |

**Priority fixes**: Remove stray icons, improve empty state CTA, surface cache-fallback feedback

---

## 12. PlantDetailScreen (`src/screens/PlantDetailScreen.tsx`)

| Criteria | Rating | Issues |
|----------|--------|--------|
| Spacing | ✅ | Good |
| Typography | ✅ | Excellent |
| Visual Balance | ✅ | Clean layout |
| Card Usage | ✅ | Care list, notes card, tags well done |
| Loading States | ⚠️ | Full-screen spinner — skeleton would be better |
| Error States | ✅ | Alert on fetch failure |
| Accessibility | ❌ | No labels on favorite toggle, back button, delete |
| Responsiveness | ⚠️ | Hero image is fixed 220px — would benefit from parallax scroll effect |

**Priority fixes**: Skeleton loading, favorite toggle label, parallax hero

---

## 13. ReminderScreen (`src/screens/ReminderScreen.tsx`)

| Criteria | Rating | Issues |
|----------|--------|--------|
| Spacing | ✅ | Good form layout |
| Typography | ✅ | Good |
| Visual Balance | ⚠️ | iOS/Android date pickers look very different — expected but worth noting |
| Card Usage | ✅ | Reminder rows are card-like |
| Loading States | ✅ | Inline spinner |
| Error States | ✅ | Inline error, permission banner |
| Accessibility | ❌ | Switch needs label, date picker buttons need labels |
| Responsiveness | ⚠️ | Segmented care-type buttons may wrap on small screens |

**Priority fixes**: Care type buttons with minimum width, accessibility

---

## 14. ProfileScreen (`src/screens/ProfileScreen.tsx`)

| Criteria | Rating | Issues |
|----------|--------|--------|
| Spacing | ✅ | Good |
| Typography | ✅ | Good |
| Visual Balance | ✅ | Hero + stats + settings sections are well organized |
| Card Usage | ✅ | Settings in grouped cards |
| Loading States | ⚠️ | Full-screen spinner |
| Error States | ⚠️ | Silent catches on failures (cache, sync) |
| Accessibility | ❌ | No labels on Switch, navigation chevrons |
| Responsiveness | ✅ | |

**Priority fixes**: Offline mode toggle removal (Sprint 7), skeleton loading, accessibility

---

## 15. FavoritesScreen (`src/screens/FavoritesScreen.tsx`)

| Criteria | Rating | Issues |
|----------|--------|--------|
| Spacing | ✅ | Same as Collection |
| Typography | ✅ | Good |
| Visual Balance | ✅ | Clean, but minimal |
| Card Usage | ✅ | Same plant cards |
| Empty States | ✅ | Heart icon + clear message + action hint |
| Loading States | ❌ | No loading state at all — relies on CollectionStore being populated |
| Error States | ❌ | No error handling |
| Accessibility | ❌ | No labels |
| Responsiveness | ✅ | |

**Priority fixes**: Add loading state (waiting for store), proper stack navigation

---

## 16. PrivacyPolicyScreen (`src/screens/PrivacyPolicyScreen.tsx`)

| Criteria | Rating | Issues |
|----------|--------|--------|
| Spacing | ✅ | Clean |
| Typography | ✅ | Good |
| Visual Balance | ✅ | Simple, readable |
| Accessibility | ⚠️ | Static text — scrollable so no major issues |
| Responsiveness | ✅ | |

**Priority fixes**: Minimal — add proper document structure if needed

---

## 17. OtpReauthScreen (`src/screens/OtpReauthScreen.tsx`)

| Criteria | Rating | Issues |
|----------|--------|--------|
| Spacing | ✅ | Good centered layout |
| Typography | ✅ | Good |
| Visual Balance | ✅ | Clean |
| Accessibility | ⚠️ | Input labels missing |
| Responsiveness | ✅ | |

**Priority fixes**: Accessibility labels

---

## Cross-Cutting Issues

| Issue | Screens Affected |
|-------|-----------------|
| **No accessibility labels** on icon-only buttons | ALL screens |
| **Emoji as icons** (🌿 ✉️ 🎉 🔐) | LoginScreen, VerifyEmailScreen, OtpReauthScreen |
| **Font loading spinner** duplicated 16× | ALL screens (Sprint 1 fix) |
| **Inconsistent error feedback** (Alert vs inline) | CollectionScreen, PlantDetailScreen, ScanScreen |
| **No skeleton loading** | CollectionScreen, PlantDetailScreen, ProfileScreen |
| **No keyboard handling** on some forms | ForgotPasswordScreen could use KeyboardAvoidingView improvement |
| **Color-only indicators** (confidence badges) | IdentificationResultScreen, PlantDetailScreen |
| **Stale/incorrect UI** (arrow-up/down icons) | CollectionScreen search bar |

---

## Priority Scoring

**P0 (Must fix — bugs/blockers)**: Font loading duplication, stray icons in search, compress=1.0
**P1 (High UX impact)**: Replace emojis with SVGs/Lottie, skeleton loading, accessibility labels, confidence display
**P2 (Polish)**: Parallax hero, smooth animations, card grouping on settings screens, focus states on inputs
**P3 (Nice to have)**: Tablet adaptation, haptics, Toast system
