import { useContext } from "react";
import { IssueContext } from "./IssueContextCore";

export default function useIssues() {
  const context = useContext(IssueContext);

  if (!context) {
    throw new Error("useIssues must be used inside IssueProvider");
  }

  return context;
}
