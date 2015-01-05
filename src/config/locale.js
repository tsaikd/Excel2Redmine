app

.config(["localStorageServiceProvider", function(localStorageServiceProvider) {
	localStorageServiceProvider.setPrefix("Excel2Redmine");
}])

.config(["$translateProvider", function($translateProvider) {

	var zh_tw = {
		"Config": "設定",
		"Connect to Redmine server failed, please check config.": "Redmine 連線失敗，請檢查相關設定。"
	};

	$translateProvider.translations("zh_tw", zh_tw);
	$translateProvider.translations("zh_TW", zh_tw);

	$translateProvider
	.registerAvailableLanguageKeys(["zh_tw"], {
		"zh*": "zh_tw"
	})
	.useStorage("localStorageService")
	.determinePreferredLanguage();

}])

;
