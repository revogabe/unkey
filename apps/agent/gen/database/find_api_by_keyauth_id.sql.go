// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.20.0
// source: find_api_by_keyauth_id.sql

package database

import (
	"context"
	"database/sql"
)

const findApiByKeyAuthId = `-- name: FindApiByKeyAuthId :one
SELECT
    id, name, workspace_id, ip_whitelist, auth_type, key_auth_id
FROM
    ` + "`" + `apis` + "`" + `
WHERE
    key_auth_id = ?
`

func (q *Queries) FindApiByKeyAuthId(ctx context.Context, keyauthid sql.NullString) (Api, error) {
	row := q.db.QueryRowContext(ctx, findApiByKeyAuthId, keyauthid)
	var i Api
	err := row.Scan(
		&i.ID,
		&i.Name,
		&i.WorkspaceID,
		&i.IpWhitelist,
		&i.AuthType,
		&i.KeyAuthID,
	)
	return i, err
}