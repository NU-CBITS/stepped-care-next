class Legacy::UserSessionsController < Legacy::ApiController
  def create
    render json: {user:{guid:"3140a29275317a27ce0f2d6e1d51bdd6",group_id:"97382571c85a98b851c5e9b9e90b33a0"},session_id:"WHERE-THE-SESSION-ID-GOES"}
  end
end
