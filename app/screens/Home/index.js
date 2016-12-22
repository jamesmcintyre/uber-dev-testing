import React, {Component} from 'react';
import stringFunc1 from '1-deep-react-example';

export default class Home extends Component {
  handleSubmit = (e) => {
    e.preventDefault();
    this.context.router.push({pathname: `/${this._input.value}`});
  }

  render() {
    return (
      <div className="container home">
        <h1>{stringFunc1()}</h1>
      </div>
    );
  }
}

Home.contextTypes = {
  router: React.PropTypes.object.isRequired,
}
