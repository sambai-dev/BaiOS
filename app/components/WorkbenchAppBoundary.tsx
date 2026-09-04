// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

"use client";

import { Component, type ReactNode } from "react";

export type WorkbenchAppBoundaryProps = {
  children: ReactNode;
  resetKey?: unknown;
};

type WorkbenchAppBoundaryState = {
  hasError: boolean;
  resetKey: unknown;
};

export default class WorkbenchAppBoundary extends Component<
  WorkbenchAppBoundaryProps,
  WorkbenchAppBoundaryState
> {
  state: WorkbenchAppBoundaryState = {
    hasError: false,
    resetKey: this.props.resetKey,
  };

  static getDerivedStateFromError(): Partial<WorkbenchAppBoundaryState> {
    return { hasError: true };
  }

  static getDerivedStateFromProps(
    props: WorkbenchAppBoundaryProps,
    state: WorkbenchAppBoundaryState,
  ): WorkbenchAppBoundaryState | null {
    if (!Object.is(props.resetKey, state.resetKey)) {
      return { hasError: false, resetKey: props.resetKey };
    }

    return null;
  }

  componentDidCatch(error: unknown) {
    console.error(error);
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="os-app-loading" role="alert" aria-atomic="true">
          <span>Application interrupted. Reload this app to try again.</span>
          <button type="button" onClick={this.handleRetry}>
            Reload app
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
