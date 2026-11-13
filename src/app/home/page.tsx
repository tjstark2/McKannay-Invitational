"use client";

import { AccountHome } from "@/features/account/AccountHome";

// The bird check that used to live here moved to BirdGate, which runs on
// every page. Living only here, it was skipped by anyone arriving through an
// invite link - which was most players.
export default function HomePage() {
  return <AccountHome />;
}
