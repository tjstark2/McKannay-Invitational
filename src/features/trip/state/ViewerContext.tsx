"use client";

import { createContext, useContext } from "react";

export type Viewer = {
  canManage: boolean; // owner or admin of this trip
  isOwner: boolean;
};

const ViewerContext = createContext<Viewer>({ canManage: false, isOwner: false });

export function ViewerProvider({
  value,
  children,
}: {
  value: Viewer;
  children: React.ReactNode;
}) {
  return <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>;
}

export function useViewer(): Viewer {
  return useContext(ViewerContext);
}
