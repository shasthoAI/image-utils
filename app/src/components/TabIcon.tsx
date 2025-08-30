import * as React from "react";

export type Tab = "compress" | "split" | "pdf" | "chains" | "jobs";

export const TabIcon: React.FC<{ tab: Tab }> = ({ tab }) => {
  const icon =
    tab === "compress" ? (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M3 3h18v4H3zM3 10h18v4H3zM3 17h18v4H3z" />
      </svg>
    ) : tab === "split" ? (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
      </svg>
    ) : tab === "pdf" ? (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zm0 0l6 6" />
      </svg>
    ) : tab === "chains" ? (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M7.5 7a4.5 4.5 0 000 9H10v-2H7.5a2.5 2.5 0 010-5H10V7H7.5zm6.5 0h2.5a4.5 4.5 0 010 9H14v-2h2.5a2.5 2.5 0 000-5H14V7z" />
      </svg>
    ) : (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M4 4h16v2H4zM4 11h16v2H4zM4 18h16v2H4z" />
      </svg>
    );
  return <span className="text-current">{icon}</span>;
};

