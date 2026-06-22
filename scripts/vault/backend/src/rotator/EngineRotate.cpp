/**
 * @file EngineRotate.cpp
 * @brief Rotation engine: applying rotations + persisting results.
 */
#include "rotator/Engine.h"
#include "rotator/Registry.h"
#include "rotator/Snapshot.h"

namespace vault::rotator
{

static Json::Value record(const std::string& ts, const Json::Value& t,
                          const char* result)
{
    Json::Value r;
    r["ts"] = ts;
    r["name"] = t["name"];
    r["adapter"] = t["adapter"];
    r["result"] = result;
    return r;
}

RotateOutcome Engine::rotateTarget(const Json::Value& target,
                                   const std::string& password)
{
    RotateOutcome out;
    out.secretEnvKey = target["secret_env_key"].asString();
    std::string pw = password.empty() ? genPassword() : password;

    Stamp ts = stampNow();
    Json::Value records(Json::arrayValue);
    try {
        makeAdapter(target["adapter"].asString())
            ->rotate(target["params"], pw);
    } catch (const std::exception& e) {
        Json::Value rec = record(ts.iso, target, "fail");
        rec["error"] = e.what();
        records.append(rec);
        appendHistory(records);
        out.error = e.what();
        return out;
    }

    writeSnapshot({{out.secretEnvKey, pw}}, ts);
    Json::Value rec = record(ts.iso, target, "ok");
    rec["secret_env_key"] = out.secretEnvKey;
    records.append(rec);
    appendHistory(records);

    out.ok = true;
    out.password = pw;
    return out;
}

int Engine::rotateAll(const std::vector<std::string>& only,
                      const std::string& password, bool dryRun,
                      bool stopOnError, std::vector<std::string>& log)
{
    auto targets = selectTargets(only);
    Stamp ts = stampNow();
    EnvMap values;
    Json::Value records(Json::arrayValue);
    int failures = 0;

    for (const auto& t : targets) {
        std::string name = t["name"].asString();
        std::string pw = password.empty() ? genPassword() : password;
        if (dryRun) {
            log.push_back("[dry-run] " + name + " via " +
                          t["adapter"].asString() + " -> would rotate");
            continue;
        }
        try {
            makeAdapter(t["adapter"].asString())->rotate(t["params"], pw);
        } catch (const std::exception& e) {
            log.push_back("[fail] " + name + ": " + e.what());
            Json::Value rec = record(ts.iso, t, "fail");
            rec["error"] = e.what();
            records.append(rec);
            ++failures;
            if (stopOnError)
                break;
            continue;
        }
        values[t["secret_env_key"].asString()] = pw;
        Json::Value rec = record(ts.iso, t, "ok");
        rec["secret_env_key"] = t["secret_env_key"];
        records.append(rec);
        log.push_back("[ok] " + name + " -> " + t["secret_env_key"].asString());
    }

    if (!dryRun) {
        if (!values.empty())
            writeSnapshot(values, ts);
        appendHistory(records);
    }
    return failures;
}

} // namespace vault::rotator
