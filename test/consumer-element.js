import '../d2l-fetch-siren-entity-behavior.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
Polymer({
	is: 'consumer-element',
	behaviors: [
		D2L.PolymerBehaviors.FetchSirenEntityBehavior
	]
});
