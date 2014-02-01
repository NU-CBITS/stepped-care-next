require 'spec_helper'

describe 'coach conversation comments api' do
  describe 'GET /data/groups/:group_guid/users/:user_guid/xelements/STEPPED-CARE-COACH-CONVO-COMMENTS-GUID' do
    it 'should return all coach conversation comments for the user' do
      get_json '/data/groups/group0/users/user0/xelements/STEPPED-CARE-COACH-CONVO-COMMENTS-GUID'

      expect(response.status).to eq(200)
    end
  end
end
