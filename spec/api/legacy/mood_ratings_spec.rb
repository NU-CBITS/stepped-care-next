require 'spec_helper'

describe 'mood ratings api' do
  fixtures :mood_ratings

  describe 'GET /data/groups/:group_guid/users/:user_guid/xelements/STEPPED-CARE-MOOD-RATINGS-GUID' do
    it 'should return all of the mood ratings for the user' do
      get_json '/data/groups/group0/users/user0/xelements/STEPPED-CARE-MOOD-RATINGS-GUID'

      expect(response.status).to eq(200)
    end
  end

  describe 'POST /data/groups/:group_guid/users/:user_guid/xelements/STEPPED-CARE-MOOD-RATINGS-GUID' do
    it 'should create a mood rating for the user' do
      params = {
        user_id: 'user0',
        values: ['3']
      }
      post_json '/data/groups/group0/users/user0/xelements/STEPPED-CARE-MOOD-RATINGS-GUID', params

      expect(response.status).to eq(201)
    end
  end

  describe 'PUT /data/groups/:group_guid/users/:user_guid/xelements/STEPPED-CARE-MOOD-RATINGS-GUID/:mood_rating_guid' do
    it 'should update a mood rating for the user' do
      params = {
        values: ['4']
      }
      put_json '/data/groups/group0/users/user0/xelements/STEPPED-CARE-MOOD-RATINGS-GUID/rating0', params

      expect(response.status).to eq(200)
    end
  end
end
