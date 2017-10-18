# d2l-fetch-siren-entity-behavior

A Polymer-based behaviour to make requests and get back a parsed siren entity. Requests userUrl and token.

## Installation

`d2l-fetch-siren-entity-behavior` can be installed from Bower:

```shell
bower install Brightspace/d2l-fetch-siren-entity-behavior#^1.0.0
```

## Usage

Add the behavior to your component:

```js
<link rel="import" href="../../d2l-fetch-siren-entity-behavior/d2l-fetch-siren-entity-behavior.html">

<script>
	'use strict';

	Polymer({
		is: 'some-component',
		behaviors: [
			window.D2L.FetchSirenEntityBehavior
		]
	});
</script>
```

Then use it to fetch siren entities from hypermedia api endpoints:

```js
_getUser: function() {
	return this._fetchEntityWithToken(this.userUrl, this.getToken);
},
```

### _fetchEntity
This function does not provide authorization headers, relying on d2l middleware to apply any if applicable.
This function is best used for requests that do not require auth or that are ok to be made in the context of the logged in user.
This function accepts one parameter:
* `url`: The endpoint to request siren data from.

### _fetchEntityWithToken
This function will apply an `Authorization` header with a `bearer` token to the request. It requires a 'token getter' function that can be
called to retrieve an applicable token.

This function accepts three parameters:
* `url`: The endpoint to request siren data from.
* `getToken`: A 'token getter' function that will perform the logic to retrieve or refresh an auth token.
* `userUrl`: The href to uniquely identify the user token to get. If omitted the `url` parameter will be passed to the `getToken` function instead.

## Browser compatibility

`d2l-fetch-siren-entity-behavior` makes use of two javascript features that are not yet fully supported across all modern browsers: the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) and [Promises](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise). If you need to support browsers that do not yet implement these features you will need to include polyfills for this functionality.

We recommend:

* [fetch](https://github.com/github/fetch)
* [promise-polyfill](https://github.com/PolymerLabs/promise-polyfill/)
