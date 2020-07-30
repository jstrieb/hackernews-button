hn-discussion.zip: manifest.json background.js icons
	zip --recurse-paths hn-discussion.zip manifest.json background.js icons


icons: ycombinator-logo.jpg
	mkdir -p icons
	convert -resize 16x16 ycombinator-logo.jpg icons/icon-16.png
	convert -resize 32x32 ycombinator-logo.jpg icons/icon-32.png
	convert -resize 48x48 ycombinator-logo.jpg icons/icon-48.png
	convert -resize 64x64 ycombinator-logo.jpg icons/icon-64.png
	convert -resize 96x96 ycombinator-logo.jpg icons/icon-96.png


ycombinator-logo.jpg:
	curl -o "ycombinator-logo.jpg" "https://feeds.backtracks.fm/feeds/series/cb81757a-3054-11e7-89cf-0e1b887eb36a/images/main.jpg"
