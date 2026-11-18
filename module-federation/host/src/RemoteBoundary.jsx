import { Component } from 'react';

// A remote can fail to load (network, 503, bad deploy) or throw while rendering. Each slot gets its own
// boundary, so one team's failure only takes down its own slot.
export class RemoteBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    this.props.onError?.(`✖ ${this.props.team} failed: ${error.message}`);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="shell-fallback">
          The {this.props.team} micro frontend failed to load. The rest of the shop still works.
          <div className="small">{this.state.error.message}</div>
        </div>
      );
    }
    return this.props.children;
  }
}
