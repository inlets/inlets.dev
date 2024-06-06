FROM ruby:2.6.3

RUN curl -sLS https://get.arkade.dev | sh && \
    arkade system install node

WORKDIR /srv/jekyll

RUN gem install bundler:2.2.13

RUN npm i -g yarn

COPY Gemfile Gemfile
COPY Gemfile.lock Gemfile.lock

RUN bundle install -j $(nproc)

# Run this on the host and have it mounted in.
# RUN yarn install

RUN find /root/.gem
CMD ["/usr/local/bin/bundle", "exec", "jekyll", "serve", "--host=0.0.0.0", "--trace"]
