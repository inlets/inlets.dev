## inlets.dev homepage

[![Netlify Status](https://api.netlify.com/api/v1/badges/fd9c25fb-865c-481e-adcf-90f6a0a7a0cc/deploy-status)](https://app.netlify.com/sites/inlets-dev/deploys)

## Adding a new blog post

* Create an issue and propose the topic. Wait for approval before contributing, unless you've already been asked to contribute a post.

* Create a new YAML file in `blog/_posts` - see [this example](https://github.com/alexellis/inlets.dev/blob/master/blog/_posts/2020-10-29-preparing-docker-hub-rate-limits.md) for how to set the post title and description.

* Prefix it with the date.

* Add images to `/images/` - resize all images to under 200-300KB, for a faster page loading time

* Make sure you have a cropped image for the background / title of the post, this will show up on the page roll-up at /blog/ - good sources for images are: unsplash.com and pexels.com

* Sign-off any commits you make with `git commit -s`, this is not GPG or cryptography, but [a simple declaration](https://en.wikipedia.org/wiki/Developer_Certificate_of_Origin)

* Raise a Pull Request and fill out the whole template, including how you tested the page and the instructions.

If you use any copyrighted material such as text, code, or images, then you must credit the author.

## Usage

## Initial installation

You will need node.js in order to install yarn:

```bash
$ npm i -g yarn
```

You may need to run `brew install/upgrade ruby` if the `bundle` command is unavailable.

If it's still unavailable run:

```bash
$ gem install bundle
```

Install Bundler, and set up your Ruby gem environment:

MacOS:

```bash
export GEM_HOME=$HOME/.gem
export PATH=$HOME/.gem/bin:$PATH

$ arch -arch x86_64 gem install bundler:2.2.13
$ arch -arch x86_64 bundle install
```

Other systems:

```bash
export GEM_HOME=$HOME/.gem
export PATH=$HOME/.gem/bin:$PATH

$ gem install bundler:2.2.13
$ bundle install
```

Install Yarn dependencies:

```bash
$ yarn install

$ yarn run tailwind init _includes/tailwind.config.js
```

### For production:

```bash
JEKYLL_ENV=production bundle exec jekyll build
```

Content will be in `_site`

### To start a preview, simply run:

```bash
$GEM_HOME/bin/bundle exec jekyll serve
```

Access the site at: http://127.0.0.1:4000/

Apple M1:

```bash
export GEM_HOME=$HOME/.gem
export PATH=$HOME/.gem/bin:$PATH

arch -arch x86_64 $GEM_HOME/bin/bundle install
arch -arch x86_64 $GEM_HOME/bin/bundle exec jekyll serve
```

