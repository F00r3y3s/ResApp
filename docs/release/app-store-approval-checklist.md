# App Store Approval Checklist

This checklist is a release gate. Do not submit to App Store Review until every item is marked done with evidence.

| Status | Gate | Phase | Evidence |
| --- | --- | --- | --- |
| Pending | No Supabase service-role key, database password, or admin token in mobile code | Every PR | Secret scan output |
| Pending | No OpenAI, USDA, RevenueCat webhook, or private tracking key in mobile code | Every PR | Secret scan output |
| Pending | No in-app terminal, compiler, live code preview, or generated-code execution | Every PR | Code review |
| Pending | Production app built as static native bundle through EAS | Release | EAS build URL |
| Pending | Airplane-mode launch and core flows do not crash or white-screen | Each slice | Maestro/device run |
| Pending | No scaffold/demo/developer leftovers in visible screens or source strings | Each slice | `rg` scan |
| Pending | Feature code is modular and route files contain only route composition | Each slice | Code review |
| Pending | First AI action shows consent and names OpenAI as processing partner | Phase 7 | Device recording |
| Pending | Settings includes in-app privacy policy and terms links | Phase 1 | Screenshot |
| Pending | Privacy policy states AI data sharing for photos, receipts, labels, recipes, and prompts | Phase 7 | Policy URL |
| Pending | Authenticated settings includes Delete Account | Phase 2 | Screenshot and backend test |
| Pending | iOS premium digital features use Apple IAP through RevenueCat only | Phase 11 | RevenueCat config |
| Pending | Paywall includes Restore Purchases | Phase 11 | Screenshot |
| Pending | Expo/EAS build targets current Apple SDK requirement | Release | EAS build metadata |
| Pending | Dependencies checked for Apple privacy manifests | Release | Dependency report |
| Pending | Every tappable control is at least 44 by 44 points | Design QA | Device QA notes |
| Pending | App Review Notes include a working demo account | Release | App Store Connect notes |
| Pending | App Review Notes include private AI scan screen recording link | Release | App Store Connect notes |

## Phase Notes

- Phase 2 onboarding preferences and sync-consent screens are local-only. No account sync,
  authenticated settings, backend auth, AI processing, or telemetry gates changed in this phase.
