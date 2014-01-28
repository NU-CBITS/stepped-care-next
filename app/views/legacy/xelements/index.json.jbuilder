json.array! @slides do |s|
  json.title 'Slide '
  json.xelement_type 'static_html'
  json.xel_data_types do
    json.active_membership "array"
    json.authorization_rule_guids_list "array"
    json.content "html"
    json.content_description "string"
    json.created_at "Date"
    json.data_collections "array"
    json.days_in_treatment "int"
    json.is_presentational "bool"
    json.is_standalone "bool"
    json.metacontent_external "array"
    json.metacontent_internal "json"
    json.methods "json"
    json.produces_instantiated_data "bool"
    json.replace_remote_version "bool"
    json.required_xelement_ids "array"
    json.requires_children "bool"
    json.title "string"
    json.transmittable_to_client_at "Date"
    json.version_id "int"
    json.views "json"
    json.xelement_type "string"
  end
  json.xel_data_values do
    json.active_membership "[]"
    json.authorization_rule_guids_list "[]"
    json.content s.content.html_safe
    json.content_description "Contains static HTML."
    json.created_at nil
    json.data_collections nil
    json.days_in_treatment nil
    json.is_presentational true
    json.is_standalone true
    json.metacontent_external "{\"actions\:[]}"
    json.metacontent_internal "{}"
    json.methods "{}"
    json.produces_instantiated_data false
    json.replace_remote_version false
    json.required_xelement_ids "[]"
    json.requires_children false
    json.title s.title
    json.transmittable_to_client_at nil
    json.version_id nil
    json.views "{}"
    json.xelement_type "static_html"
  end
  json.version_id s.version_id
  json.received_at s.received_at
  json.guid s.guid
end
