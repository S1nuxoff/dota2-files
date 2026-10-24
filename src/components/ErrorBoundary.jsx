import { Component } from "react";

// A page that fails shows what failed instead of an empty screen; the menu stays usable
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(previous) {
    if (previous.page !== this.props.page && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
        <div className="text-sm">This page failed to show.</div>
        <code className="max-w-xl text-xs break-all text-ink-400">{String(this.state.error.message || this.state.error)}</code>
        <button onClick={() => history.back()} className="mt-2 h-8 rounded-md border border-ink-700 px-3 text-xs text-ink-300 hover:text-ink-100">
          Go back
        </button>
      </div>
    );
  }
}
