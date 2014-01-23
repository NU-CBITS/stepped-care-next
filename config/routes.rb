SteppedCareNext::Application.routes.draw do
  post '/sessions' => 'legacy/user_sessions#create'

  post '/data/groups/:group_guid/users/:user_guid/xelements/STEPPED-CARE-SESSIONS-GUID' => 'legacy/sessions#create'

  get '/data/groups/:group_guid/users/:user_guid/xelements/STEPPED-CARE-COACH-CONVO-POSTS-GUID' => 'legacy/coach_conversation_posts#show'

  get '/data/groups/:group_guid/users/:user_guid/xelements/STEPPED-CARE-COACH-CONVO-COMMENTS-GUID' => 'legacy/coach_conversation_comments#show'

  match '/data/groups/:group_guid/users/:user_guid/xelements/STEPPED-CARE-MOOD-RATINGS-GUID',
    :via => :options,
    :controller => 'legacy/mood_ratings',
    :action => 'options',
    :constraints => { :method => 'OPTIONS' }
  post '/data/groups/:group_guid/users/:user_guid/xelements/STEPPED-CARE-MOOD-RATINGS-GUID' => 'legacy/mood_ratings#create'

  match '/data/groups/:group_guid/users/:user_guid/xelements/THOUGHTS-TOOL-EVENTS-GUID',
    :via => :options,
    :controller => 'legacy/thoughts_tool_events',
    :action => 'options',
    :constraints => { :method => 'OPTIONS' }
  post '/data/groups/:group_guid/users/:user_guid/xelements/THOUGHTS-TOOL-EVENTS-GUID' => 'legacy/thoughts_tool_events#create'

  match '/data/groups/:group_guid/users/:user_guid/xelements/ACTIVITY-CALENDAR-EVENTS-GUID',
    :via => :options,
    :controller => 'legacy/activity_calendar_events',
    :action => 'options',
    :constraints => { :method => 'OPTIONS' }
  post '/data/groups/:group_guid/users/:user_guid/xelements/ACTIVITY-CALENDAR-EVENTS-GUID' => 'legacy/activity_calendar_events#create'
  get '/data/groups/:group_guid/users/:user_guid/xelements/ACTIVITY-CALENDAR-EVENTS-GUID' => 'legacy/activity_calendar_events#show'

  match '/data/groups/:group_guid/users/:user_guid/xelements/STEPPED-CARE-LESSON-PROGRESS-GUID',
    :via => :options,
    :controller => 'legacy/lesson_progress_events',
    :action => 'options',
    :constraints => { :method => 'OPTIONS' }
  post '/data/groups/:group_guid/users/:user_guid/xelements/STEPPED-CARE-LESSON-PROGRESS-GUID' => 'legacy/lesson_progress_events#create'

  post '/data/groups/:group_guid/users/:user_guid/xelements/STEPPED-CARE-EVENTS-GUID' => 'legacy/events#create'

  get '/xelements' => 'legacy/xelements#index'
  post '/data/groups/:group_guid/users/:user_guid/xelements/:xelement_guid' => 'legacy/xelements#create'
  get '/data/groups/:group_guid/users/:user_guid/xelements/:xelement_guid' => 'legacy/xelements#show'

  get '/users/:user_guid' => 'legacy/users#show'
end
