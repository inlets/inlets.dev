
build:
	JEKYLL_ENV=production bundle exec jekyll build -d docs


install:
	bundle install && yarn install

run:
	bundle exec jekyll serve