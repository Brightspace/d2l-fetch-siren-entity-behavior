import '@polymer/polymer/polymer-legacy.js';
import 'd2l-fetch/d2l-fetch.js';
import { IronMeta } from '@polymer/iron-meta/iron-meta.js';
import SirenParse from 'siren-parser';

window.D2L = window.D2L || {};
window.D2L.PolymerBehaviors = window.D2L.PolymerBehaviors || {};

/**
 * @typedef {string | { href: string }} SirenLinkOrUrl
 * @typedef {Pick<RequestInit, 'signal'>} FetchEntityRequestInit
 *
 * @typedef {object} FetchEntityWithTokenOpts
 * @prop {SirenLinkOrUrl} link
 * @prop {string} [userLink]
 * @prop {() => Promise<string>} getToken
 * @prop {FetchEntityRequestInit} [requestInit]
 */

/**
 * @param {SirenLinkOrUrl} sirenLinkOrUrl
 */
const extractHref = function(sirenLinkOrUrl) {
	const href = typeof sirenLinkOrUrl === 'object'
		? sirenLinkOrUrl.href
		: sirenLinkOrUrl;

	return href;
};

/*
* Behavior for basic siren entity fetching which parses output on return.
* @polymerBehavior
*/
D2L.PolymerBehaviors.FetchSirenEntityBehavior = {

	properties: {
		_clientTimeSkew: Number
	},

	registered: function() {
		window.D2L.PolymerBehaviors.FetchSirenEntityBehaviorMeta = window.D2L.PolymerBehaviors.FetchSirenEntityBehaviorMeta
			|| new IronMeta(
				{
					key: 'whitelistedDomains',
					value: [
						'api.proddev.d2l',
						'api.dev.brightspace.com',
						'api.brightspace.com',
						'bff.dev.brightspace.com'
					]
				}
			);
	},

	/**
	 * @param {SirenLinkOrUrl} sirenLinkOrUrl
	 * @param {FetchEntityRequestInit} [requestInit]
	 */
	_fetchEntity: function(sirenLinkOrUrl, requestInit) {
		var url = extractHref(sirenLinkOrUrl);
		var request = new Request(url, {
			headers: new Headers({
				Accept: 'application/vnd.siren+json'
			}),
			signal: requestInit && requestInit.signal
		});
		return this._makeRequest(request, this.__skipAuth(sirenLinkOrUrl));
	},

	/**
	 * @param {FetchEntityWithTokenOpts | SirenLinkOrUrl} linkOrOpts
	 * @param {FetchEntityWithTokenOpts['getToken']} [getToken]
	 * @param {FetchEntityWithTokenOpts['userLink']} [userUrl]
	 * @param {FetchEntityWithTokenOpts['requestInit']} [requestInit]
	 */
	_fetchEntityWithToken: function(linkOrOpts, getToken, userUrl, requestInit) {

		var ctx = {
			url: typeof linkOrOpts === 'object'
				? linkOrOpts && extractHref(linkOrOpts.link || linkOrOpts)
				: linkOrOpts,
			getToken: linkOrOpts && typeof linkOrOpts.getToken !== 'undefined'
				? linkOrOpts.getToken
				: getToken,
			userUrl: linkOrOpts && extractHref(linkOrOpts.userLink) || userUrl,
			requestInit: linkOrOpts && linkOrOpts.requestInit || requestInit || {}
		};
		// Preserve original Siren link (if provided) for future rel inspection
		var sirenLinkOrUrl = linkOrOpts && linkOrOpts.link || linkOrOpts;

		if (!ctx.url || !this._isWhitelisted(ctx.url)) {
			return Promise.reject(new Error('Invalid request url; must be a valid whitelisted domain.'));
		}

		var tokenUrl = ctx.userUrl || ctx.url;
		if (!tokenUrl || typeof ctx.getToken !== 'function') {
			return Promise.reject(new Error('Invalid inputs'));
		}

		if (this.__skipAuth(sirenLinkOrUrl)) {
			return this._makeRequest(new Request(ctx.url, {
				headers: new Headers({
					Accept: 'application/vnd.siren+json'
				}),
				signal: ctx.requestInit.signal
			}), true);
		}

		return ctx.getToken(tokenUrl)
			.then(function(token) {
				if (typeof token !== 'string') {
					throw new Error('token expected to be a string');
				}

				var request = new Request(ctx.url, {
					headers: new Headers({
						Accept: 'application/vnd.siren+json',
						Authorization: 'Bearer ' + token
					}),
					signal: ctx.requestInit.signal
				});
				return this._makeRequest(request, false);
			}.bind(this));
	},

	_makeRequest: function(request, skipAuth) {
		var self = this;

		var fetch = skipAuth
			? window.d2lfetch.removeTemp('auth')
			: window.d2lfetch;

		return fetch
			.fetch(request)
			.then(function(response) {
				if (response.ok) {
					var serverTimeUtc = new Date(response.headers.get('Date'));
					self._clientTimeSkew = serverTimeUtc - self._getCurrentTime();
					return response.json();
				}
				return Promise.reject(response.status);
			})
			.then(SirenParse);
	},

	// this function is purely for mocking out while testing
	_getCurrentTime: function() {
		return new Date();
	},

	_addDomains: function(domains) {
		if (domains && domains instanceof Array) {
			new IronMeta({ key: 'whitelistedDomains'}).value = this.__mergeAndDedupe(
				this._getWhitelist(),
				domains
			);
		}
	},

	__skipAuth: function(sirenLinkOrUrl) {
		if (!sirenLinkOrUrl) {
			return false;
		}

		if (!Array.isArray(sirenLinkOrUrl.rel)) {
			return false;
		}

		if (-1 === sirenLinkOrUrl.rel.indexOf('nofollow')) {
			return false;
		}

		return true;
	},

	__mergeAndDedupe: function(array1, array2) {
		var result = [];
		var observed = {};
		var all = array1.concat(array2);

		all.forEach(function(item) {
			if (!observed[item]) {
				result.push(item);
				observed[item] = true;
			}
		});

		return result;
	},

	_getWhitelist: function() {
		return window.D2L.PolymerBehaviors.FetchSirenEntityBehaviorMeta.byKey('whitelistedDomains');
	},

	_isWhitelisted: function(url) {
		/* expression taken from URI spec parsing section: https://tools.ietf.org/html/rfc3986#appendix-B
		   useful groups:
			 protocol  = $2
			 host	  = $4
			 path	  = $5
			 query	 = $6
			 fragment  = $7
		*/
		var uriExpression = /^(([^:\/?#]+):)?(\/\/([^\/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/; //eslint-disable-line no-useless-escape
		var match_protocol  = 2;
		var match_host	  = 4;

		var matches = url.match(uriExpression);
		if (matches[match_protocol] !== 'https') {
			return false;
		}
		var host = matches[match_host];
		if (!host) {
			return false;
		}
		return 0 <= this._getWhitelist()
			.findIndex(function(domain) {
				if (domain === host) {
					return true;
				}
				return host.endsWith('.' + domain);
			});
	}

};
