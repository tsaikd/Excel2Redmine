app

.factory("RedmineCommon"
	, [       "$http", "$q", "$window", "Config"
	, function($http,   $q,   $window,   Config) {

	function RedmineCommon() {}

	RedmineCommon.prototype.jsonp = function(opts) {
		var $scope = this;
		var deferred = $q.defer();
		var params;

		opts = angular.extend({
			method: "GET",
			url: "",
			params: {},
			data: ""
		}, opts);

		if (opts.method == "JSONP") {
			params = angular.extend({
				callback: "JSON_CALLBACK"
			}, opts.params);
		}

		// hack for jsonp
		// http://stackoverflow.com/questions/16560843/json-callback-not-found-using-jsonp
		var c = $window.angular.callbacks.counter.toString(36);
		var ci = 0;
		while ($window['angularcallbacks_' + c]) {
			ci++;
			c = ($window.angular.callbacks.counter + ci).toString(36);
		}
		$window['angularcallbacks_' + c] = function(data) {
			$window.angular.callbacks['_' + c](data);
			delete $window['angularcallbacks_' + c];
		};

		$http({
			method: opts.method,
			url: Config.url.replace(/\/*$/, "") + opts.url,
			params: params,
			data: opts.data,
			headers: {
				"X-Redmine-API-Key": Config.apikey
			}
		})
		.success(function(data, status, headers, config) {
			deferred.resolve({
				data: data,
				status: status,
				headers: headers,
				config: config,
				opts: opts
			});
		})
		.error(function(data, status, headers, config) {
			deferred.reject({
				data: data,
				status: status,
				headers: headers,
				config: config,
				opts: opts
			});
		});

		return deferred.promise;
	};

	return new RedmineCommon();
}])

;
