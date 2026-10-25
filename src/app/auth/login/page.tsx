// /auth/login is kept as an alias of the canonical /auth/signin page so that
// older links (and the chat page's router.push("/auth/login")) keep working.
// The real login form lives in ../signin/page.
import SignInPage from "../signin/page";

export default SignInPage;
