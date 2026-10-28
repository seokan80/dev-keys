source "$(dirname "${BASH_SOURCE[0]}")/service-fixtures.sh"
step 'pwd'
step "file='project/notes/release notes.txt'"
step 'printf "%s\n" "$file"'
step 'cat "$file"'
step "printf '%s\n' '\$file'"
step 'printf "<%s>\n" "$file"'
step 'printf "<%s>\n" $file'
step "pattern='project/logs/*.log'"
step 'printf "%s\n" "$pattern"'
step 'printf "%s\n" $pattern'
step 'name=world'
step 'printf "%s\n" "hello $name"'
step "printf '%s\n' 'hello \$name'"
step "label='release candidate'"
step 'printf "%s\n" "$label"'
step 'unset label'
step 'printf "%s\n" "${label:-draft}"'
step 'lines=$(wc -l < project/logs/app.log)'
step 'printf "log lines: %s\n" "$lines"'
step 'printf "%s\n" "config/${name}.env"'
step 'export APP_ENV=staging'
step "bash --noprofile --norc -c 'printf \"%s\\n\" \"\$APP_ENV\"'"
