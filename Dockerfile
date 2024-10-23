FROM ruby:2.7
ENV PATH=$PATH:/usr/local/bin/
USER root 
# RUN curl -sLS https://get.arkade.dev | sh
RUN curl -SLs https://github.com/alexellis/arkade/releases/download/0.11.28/arkade-arm64 -o /usr/local/bin/arkade && find /usr/local/bin/ \
    && chmod +x /usr/local/bin/arkade
RUN arkade system install node

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
