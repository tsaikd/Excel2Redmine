app

.factory("RedmineIssue"
	, [       "RedmineCommon"
	, function(RedmineCommon) {

	function RedmineIssue() {}

	RedmineIssue.prototype.list = function(opts) {
		opts = angular.extend({
			url: "/issues.json",
			params: {}
		}, opts);

		return RedmineCommon.jsonp(opts);
	};

	RedmineIssue.prototype.status = function(opts) {
		opts = angular.extend({
			url: "/issue_statuses.json",
			params: {}
		}, opts);

		return RedmineCommon.jsonp(opts);
	};

	return new RedmineIssue();
}])

;
