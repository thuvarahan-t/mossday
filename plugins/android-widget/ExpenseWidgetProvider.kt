package __APPLICATION_ID__

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews

class ExpenseWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    val launch = Intent(Intent.ACTION_VIEW, Uri.parse("mossday:///expenses?compose=1"))
      .setClass(context, MainActivity::class.java)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    val openExpense = PendingIntent.getActivity(context, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val widget = RemoteViews(context.packageName, R.layout.mossday_expense_widget)
    widget.setOnClickPendingIntent(R.id.mossday_expense_action, openExpense)
    manager.updateAppWidget(ids, widget)
  }
}
