module Jekyll
  module CapitalizeFilter
    def capitalize_first(input)
      input.capitalize
    end
  end
end
  
Liquid::Template.register_filter(Jekyll::CapitalizeFilter)
  