# d2l-fetch-siren-entity-behavior


A Polymer-based behaviour to make requests and get back a parsed siren entity. Requests userUrl and token.


## Browser compatibility

`d2l-fetch-siren-entity-behavior` makes use of two javascript features that are not yet fully supported across all modern browsers: the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) and [Promises](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise). If you need to support browsers that do not yet implement these features you will need to include polyfills for this functionality.

We recommend:

* [fetch](https://github.com/github/fetch)
* [promise-polyfill](https://github.com/PolymerLabs/promise-polyfill/)
