## inlets.dev homepage

## Adding a new blog post

* Create an issue and propose the topic. Wait for approval before contributing.

* Create a new YAML file in `blog/_posts` - see [this example](https://github.com/alexellis/inlets.dev/blob/master/blog/_posts/2020-10-29-preparing-docker-hub-rate-limits.md) for how to set the post title and description.

* Prefix it with the date.

* Add images to `/images/` - resize all images to < 200-300KB.

* Raise a Pull Request

If you use any copyrighted material such as text, code, or images, then you must credit the author.

## Usage

### Locally

```bash
bundle exec jekyll serve
```

### Production

```bash
JEKYLL_ENV=production bundle exec jekyll build
```

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
