require 'spec_helper'

describe 'app events api' do
  describe 'POST /data/groups/:group_guid/users/:user_guid/xelements/STEPPED-CARE-SESSIONS-GUID' do
    it 'should create a new app event' do
      params = {
        values: ['', 'action', 'page_id']
      }
      post_json '/data/groups/group0/users/user0/xelements/STEPPED-CARE-SESSIONS-GUID', params

      expect(response.status).to eq(201)
    end
  end
end
