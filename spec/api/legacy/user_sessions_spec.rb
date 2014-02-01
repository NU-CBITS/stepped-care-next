require 'spec_helper'

describe 'user sessions api' do
  describe 'POST /sessions' do
    it 'should return success' do
      post '/sessions'
      expect(response.status).to eq(200)
    end
  end
end
