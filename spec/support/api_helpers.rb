module Api
  module JsonHelpers
    JSON_HEADERS = { 'HTTP_ACCEPT' => 'application/json' }

    def json_response
      @json_response ||= JSON.parse(response.body)
    end

    def get_json(url, params = nil)
      get url, params, JSON_HEADERS
    end

    def post_json(url, params)
      post url, params, JSON_HEADERS
    end

    def put_json(url, params)
      put url, params, JSON_HEADERS
    end
  end
end
