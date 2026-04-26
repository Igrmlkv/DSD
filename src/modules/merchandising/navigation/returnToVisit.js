import { CommonActions } from '@react-navigation/native';
import { SCREEN_NAMES } from '../../../constants/screens';

// Returns the user to PresellerVisitScreen so the "Complete Visit" button is one tap away.
// Three cases:
//   1. PresellerVisit is in the back stack (regular flow: route → visit → audit) →
//      pop merch screens off the top until we land on it.
//   2. PresellerVisit is NOT in the stack (test bypass entry from PresellerHome) →
//      pop everything to the route list (closest sensible target).
//   3. Anything unexpected → fall back to popToTop so we never get stuck.
export function returnToVisit(navigation) {
  try {
    const state = navigation.getState();
    const routes = state?.routes || [];
    const visitIdx = [...routes].reverse().findIndex((r) => r.name === SCREEN_NAMES.PRESELLER_VISIT);
    if (visitIdx >= 0) {
      // routes is reversed; the absolute index from the start is (length-1 - visitIdx).
      const absoluteIdx = routes.length - 1 - visitIdx;
      navigation.dispatch(
        CommonActions.reset({
          index: absoluteIdx,
          routes: routes.slice(0, absoluteIdx + 1),
        })
      );
      return;
    }
  } catch { /* fall through */ }
  try { navigation.popToTop(); } catch { /* navigator already at top */ }
}
