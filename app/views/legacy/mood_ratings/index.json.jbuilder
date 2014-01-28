json.array! @mood_ratings do |r|
  json._id 'abcd'
  json.created_at r.created_at
  json.datatypes ['string', 'string', 'datetime'].to_json
  json.group_id 'groupy'
  json.id 'asdf'
  json.instance_id 'qwerty'
  json.names ['id', 'text', 'last_viewed_at']
  json.received_at Time.now
  json.transmitted_at Time.now
  json.user_id 'foo'
  json.values ['asdf', r.rating, Time.now]
  json.xelement_id 'STEPPED-CARE-MOOD-RATINGS-GUID'
end
