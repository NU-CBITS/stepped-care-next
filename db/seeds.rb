require 'json'

x = JSON.parse File.open('/Users/ericcf/work/stepped-care/all_xelements.json').read

x.each do |xel|
  case xel['xelement_type']
  when 'static_html'
    Slide.create(
      guid: xel['guid'],
      title: xel['xel_data_values']['title'],
      content: xel['xel_data_values']['content'],
      version_id: xel['version_id'],
      received_at: xel['received_at']
    )
  when 'question_group'
    QuestionGroup.create(
      guid: xel['guid'],
      title: xel['xel_data_values']['title']
    )
  when 'question'
    Question.create(
      guid: xel['guid'],
      content: xel['xel_data_values']['content'],
      metacontent_external: xel['xel_data_values']['metacontent_external']
    )
  when 'guide'
    Guide.create(
      guid: xel['guid'],
      title: xel['xel_data_values']['title'],
      version_id: xel['version_id'],
      received_at: xel['received_at']
    )
  end
end

users_js = File.open('/Users/ericcf/work/stepped-care/stepped-care-next/public/pages/authentication_assets/users.js').read
users_json = users_js.gsub(/^define\(\[\], /, '').gsub(/\);\r\n/, '')
users = JSON.parse users_json

users.each do |user|
  User.create(
    guid: user['guid'],
    study_id: user['study_id'],
    group_id: user['group_id'],
    username: user['username'],
    study_role: user['study_role'],
    contact_info: user['contact_info'],
    start_date: user['start_date'],
    created_at: user['created_at'],
    transmitted_at: user['transmitted_at'],
    received_at: user['received_at']
  )
end

groups_js = File.open('/Users/ericcf/work/stepped-care/stepped-care-next/public/pages/authentication_assets/groups.js').read
groups_json = groups_js.gsub(/^define\(\[\], /, '').gsub(/\);\r\n/, '')
groups = JSON.parse groups_json

groups.each do |group|
  Group.create(
    name: group['name'],
    lockout_date: group['lockout_date'],
    transmitted_at: group['transmitted_at'],
    version_id: group['version_id'],
    received_at: group['received_at'],
    guid: group['guid'],
    start_date: group['start_date']
  )
end
