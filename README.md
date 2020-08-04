## Usage

### Locally

`bundle exec jekyll serve`

### Production

`JEKYLL_ENV=production bundle exec jekyll build`

## Installation

You may need to run `brew install/upgrade ruby` if the `bundle` command is unavailable.

```shell
$ bundle install
$ yarn install

$ yarn run tailwind init _includes/tailwind.config.js
```

## Build for prod

Github Pages doesn't support the `tailwind build`, so you need to publish the site using static HTML.

In the root of the repo run `make build`. This will generate the site in the `docs` folder. Commit this and push it to GitHub, it will then be served.


