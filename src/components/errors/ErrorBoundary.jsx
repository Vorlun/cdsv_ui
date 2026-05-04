import React from "react";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";

export class SocErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (typeof this.props.onError === "function") {
      this.props.onError(error, info);
    }
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    const { children, fallbackTitle = "Console fault" } = this.props;

    const { error } = this.state;
    if (!error) return children;

    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 bg-[#0B0F1A] p-8">
        <ErrorBanner
          title={fallbackTitle}
          message={error?.message ?? "Unhandled render failure in SOC shell."}
          onRetry={() => window.location.reload()}
        />
        <button
          type="button"
          onClick={this.handleRetry}
          className="text-sm text-[#93c5fd] underline underline-offset-2 hover:text-white"
        >
          Dismiss overlay (experimental)
        </button>
      </div>
    );
  }
}
