## Usage

### Locally

`bundle exec jekyll serve`

### Production

`JEKYLL_ENV=production bundle exec jekyll build`

## Install


```shell
$ bundle install
$ yarn install

$ yarn run tailwind init _includes/tailwind.config.js
```

## Build for prod
Github pages dont support the tailwind build. You need to publish using static HTML, through using the "docs" folder and deploying GH pages through that - you could also self host? (fasd + inlets)

In the root of the repo run `make build`. This will generate the site in the docs folder. Commit this and push.
