/**
 * @file HistoryCtrl.cpp
 * @brief Recent credential history implementation.
 */
#include "controllers/HistoryCtrl.h"
#include "services/CredentialStore.h"

using namespace drogon;

namespace vault
{

void HistoryCtrl::history(const HttpRequestPtr&,
                          std::function<void(const HttpResponsePtr&)>&& cb)
{
    cb(HttpResponse::newHttpJsonResponse(CredentialStore::history(50)));
}

} // namespace vault
