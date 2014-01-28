class CreateGuides < ActiveRecord::Migration
  def change
    create_table :guides do |t|
      t.string :title
      t.string :guid
      t.string :received_at
      t.string :version_id

      t.timestamps
    end
  end
end
