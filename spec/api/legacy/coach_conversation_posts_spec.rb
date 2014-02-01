require 'spec_helper'

describe 'coach conversation posts api' do
  describe 'GET /data/groups/:group_guid/users/:user_guid/xelements/STEPPED-CARE-COACH-CONVO-POSTS-GUID' do
    it 'should return all coach conversation posts for the user' do
      get_json '/data/groups/group0/users/user0/xelements/STEPPED-CARE-COACH-CONVO-POSTS-GUID'

      expect(response.status).to eq(200)
    end
  end

  describe 'POST /data/groups/:group_guid/users/:user_guid/xelements/STEPPED-CARE-COACH-CONVO-POSTS-GUID' do
    it 'should create a new coach conversation post for the user' do
      params = {
        user_id: 'user0',
        values: ['lorem ipsum'],
        transmitted_at: Time.now.to_s
      }
      post_json '/data/groups/group0/users/user0/xelements/STEPPED-CARE-COACH-CONVO-POSTS-GUID', params

      expect(response.status).to eq(201)
    end
  end
end
