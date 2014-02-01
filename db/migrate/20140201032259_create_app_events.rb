class CreateAppEvents < ActiveRecord::Migration
  def change
    create_table :app_events do |t|
      t.string :user_guid
      t.string :page
      t.string :action

      t.timestamps
    end
  end
end
