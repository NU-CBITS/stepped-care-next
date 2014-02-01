class CreateConversationPosts < ActiveRecord::Migration
  def change
    create_table :conversation_posts do |t|
      t.string :transmitted_at
      t.string :user_guid
      t.string :text

      t.timestamps
    end
  end
end
